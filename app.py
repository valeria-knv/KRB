import base64
import logging
from flask import Flask, redirect, url_for, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import json
import boto3
from botocore.exceptions import ClientError
import time
from flask_cors import CORS
from transcribe import Transcribe
from models import db, User, Audio, Transcription
import threading 
import uuid as uuid_lib
from celery import Celery
from llmworker import LLMWorker

#Encryption libs
from Crypto.Hash import MD5
from Crypto.Util.Padding import unpad
from Crypto.Cipher import AES

import os
import uuid
import whisper
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from pydub import AudioSegment

#request
from urllib import request as urlrequest

#auth
from auth_routes import auth_bp, token_required
from transcription_routes import transcription_bp


app = Flask(__name__)

CORS(app, 
     origins=["http://localhost:3000"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

app.register_blueprint(auth_bp)
app.register_blueprint(transcription_bp)

load_dotenv()

#PostgreSQL
database_url = os.getenv('DATABASE_URL')
if not database_url:
    raise ValueError("DATABASE_URL не знайдено в .env файлі")

if database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}

db.init_app(app)
migrate = Migrate(app, db)

# Configure Celery
app.config.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0'
)

celery = Celery(
        app.import_name,
        broker=app.config['broker_url'],
        backend=app.config['result_backend']    
    )

celery.conf.update(app.config)


UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

transcription_tasks = {}


def get_audio_duration(file_path):
    """Отримує тривалість аудіофайлу"""
    try:
        audio = AudioSegment.from_file(file_path)
        return len(audio) / 1000.0
    except Exception as e:
        app.logger.error(f"Error getting audio duration: {str(e)}")
        return None


def transcribe_process_thread(file_path, tr_uuid, model_type='base'):
    """Функція для асинхронної транскрипції в окремому потоці"""
    try:
        print(f"Starting transcription for {tr_uuid}")
        
        transcription_tasks[str(tr_uuid)] = {
            'status': 'processing',
            'progress': 0,
            'message': 'Starting transcription...'
        }
        
        with app.app_context():
            transcription = Transcription.query.filter_by(uuid=tr_uuid).first()
            if not transcription:
                raise Exception(f"Transcription with UUID {tr_uuid} not found")
            
            transcription.status = "processing"
            db.session.commit()

            transcribe = Transcribe()
            
            transcription_tasks[str(tr_uuid)]['progress'] = 20
            transcription_tasks[str(tr_uuid)]['message'] = 'Normalizing audio...'
            
            pre_loaded_file = transcribe.get_audio_data(file_path)
            normalized_file = transcribe.audio_normalize(pre_loaded_file)
            
            transcription_tasks[str(tr_uuid)]['progress'] = 40
            transcription_tasks[str(tr_uuid)]['message'] = 'Transcribing audio...'
            
            try:
                result = transcribe.audio_to_text(model=model_type, mediafile=normalized_file)
            except Exception as e:
                print(f"Model {model_type} failed, trying base model: {str(e)}")
                result = transcribe.audio_to_text(model='base', mediafile=normalized_file)
            
            transcription_tasks[str(tr_uuid)]['progress'] = 70
            transcription_tasks[str(tr_uuid)]['message'] = 'Analyzing speakers...'
            
            try:
                diarization_result = transcribe.diarization(audio_location=normalized_file)
                speakers_json, speakers_text = transcribe.match_transcription_diarization(
                    diarization_result, result, normalized_file)
            except Exception as e:
                print(f"Diarization failed: {str(e)}")
                speakers_json = {}
                speakers_text = result['text']
            
            transcription_tasks[str(tr_uuid)]['progress'] = 90
            transcription_tasks[str(tr_uuid)]['message'] = 'Saving results...'
            
            transcription.text = result['text']
            transcription.speakers_text = speakers_text
            transcription.speakers_json = speakers_json
            transcription.language = result.get('language', 'unknown')
            transcription.status = "completed"
            db.session.commit()
            
            for f in [file_path, pre_loaded_file, normalized_file]:
                try:
                    if os.path.exists(f):
                        os.remove(f)
                except Exception as e:
                    print(f"Error removing file {f}: {str(e)}")
            
            transcription_tasks[str(tr_uuid)] = {
                'status': 'completed',
                'progress': 100,
                'message': 'Transcription completed successfully',
                'result': {
                    'text': result['text'],
                    'speakers_text': speakers_text,
                    'speakers_json': speakers_json,
                    'language': result.get('language', 'unknown')
                }
            }
            
            print(f"Transcription completed for {tr_uuid}")
        
    except Exception as e:
        print(f"Transcription error for {tr_uuid}: {str(e)}")
        
        try:
            with app.app_context():
                transcription = Transcription.query.filter_by(uuid=tr_uuid).first()
                if transcription:
                    transcription.status = "failed"
                    db.session.commit()
        except Exception as db_error:
            print(f"Database error: {str(db_error)}")
        
        transcription_tasks[str(tr_uuid)] = {
            'status': 'failed',
            'progress': 0,
            'message': f'Transcription failed: {str(e)}'
        }


def get_current_user_from_token():
    """Отримує поточного користувача з JWT токена"""
    try:
        token = request.headers.get('Authorization')
        
        if not token:
            return None
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        from auth_routes import JWT_SECRET
        import jwt
        
        data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        current_user = User.query.filter_by(id=data['user_id']).first()
        
        return current_user
        
    except Exception as e:
        print(f"Error getting user from token: {str(e)}")
        return None


@app.route('/', methods=['GET'])
def index():
    return jsonify(
        status='Index Page',
        description='Transcription API v1.0',
        database='PostgreSQL'
    )


@app.route('/upload', methods=['POST'])
def upload_file():
    """Завантаження файлу та запуск асинхронної транскрипції"""
    current_user = get_current_user_from_token()
    
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401
    
    print(f"Upload request from user: {current_user.email}")    
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        tr_uuid = uuid_lib.uuid4()
        
        filename = secure_filename(file.filename)
        unique_filename = f"{tr_uuid}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)

        file.save(file_path)
        
        if not os.path.exists(file_path):
            return jsonify({'error': 'Failed to save file'}), 500
        
        print(f"File saved to: {file_path}")
        print(f"File size: {os.path.getsize(file_path)} bytes")

        file_size = os.path.getsize(file_path)
        duration = get_audio_duration(file_path)
        file_format = filename.split('.')[-1] if '.' in filename else None

        audio = Audio(
            uuid=tr_uuid,
            user_id=current_user.id,
            filename=filename,
            file_path=file_path,
            file_size=file_size,
            duration=duration,
            format=file_format
        )
        db.session.add(audio)
        db.session.flush() 

        transcription = Transcription(
            uuid=tr_uuid,
            user_id=current_user.id,
            audio_id=audio.id,
            status="pending"
        )
        db.session.add(transcription)
        db.session.commit()

        transcription_tasks[str(tr_uuid)] = {
            'status': 'pending',
            'progress': 0,
            'message': 'Task queued for processing'
        }

        thread = threading.Thread(
            target=transcribe_process_thread,
            args=(file_path, tr_uuid),
            daemon=True
        )
        thread.start()
        
        return jsonify({
            'status': 'success',
            'message': 'File uploaded successfully. Transcription started.',
            'uuid': str(tr_uuid),
            'transcription_status': 'pending'
        })
        
    except Exception as e:
        app.logger.error(f"Upload error: {str(e)}")
        try:
            if 'file_path' in locals() and os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass
        return jsonify({'error': str(e)}), 500


@app.route('/status/<transcription_uuid>', methods=['GET'])
def get_transcription_status(transcription_uuid):
    """Отримання статусу транскрипції"""
    current_user = get_current_user_from_token()
    
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        transcription = Transcription.query.filter_by(
            uuid=transcription_uuid,
            user_id=current_user.id
        ).first()
        
        if not transcription:
            return jsonify({'error': 'Transcription not found'}), 404
        
        task_status = transcription_tasks.get(transcription_uuid, {
            'status': transcription.status,
            'progress': 100 if transcription.status == 'completed' else 0,
            'message': f'Status: {transcription.status}'
        })
        
        response_data = {
            'status': task_status['status'],
            'progress': task_status.get('progress', 0),
            'message': task_status.get('message', ''),
            'uuid': str(transcription.uuid),
            'created_at': transcription.created_at.isoformat() if transcription.created_at else None
        }
        
        if task_status['status'] == 'completed':
            if 'result' in task_status:
                response_data.update(task_status['result'])
            else:
                response_data.update({
                    'text': transcription.text,
                    'speakers_text': transcription.speakers_text,
                    'speakers': transcription.speakers_json,
                    'language': transcription.language
                })
        
        return jsonify(response_data)
        
    except Exception as e:
        app.logger.error(f"Error getting transcription status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/audio/<audio_uuid>', methods=['GET'])
def get_audio(audio_uuid):
    """Отримання інформації про аудіофайл"""
    current_user = get_current_user_from_token()
    
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        audio = Audio.query.filter_by(
            uuid=audio_uuid,
            user_id=current_user.id
        ).first()
        
        if not audio:
            return jsonify({'error': 'Audio not found'}), 404
            
        transcriptions = [t.to_dict() for t in audio.transcriptions]
            
        return jsonify({
            'status': 'success',
            'audio': audio.to_dict(),
            'transcriptions': transcriptions
        })
        
    except Exception as e:
        app.logger.error(f"Error getting audio: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/transcriptions', methods=['GET'])
def get_all_transcriptions():
    """Отримання всіх транскрипцій користувача"""
    current_user = get_current_user_from_token()
    
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')
        
        query = Transcription.query.filter_by(user_id=current_user.id)
        
        if status:
            query = query.filter_by(status=status)
        
        transcriptions = query.order_by(Transcription.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'status': 'success',
            'transcriptions': [t.to_dict() for t in transcriptions.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': transcriptions.total,
                'pages': transcriptions.pages
            }
        })
        
    except Exception as e:
        app.logger.error(f"Error getting transcriptions: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/transcriptions/<transcription_uuid>', methods=['GET'])
def get_transcription(transcription_uuid):
    """Отримання конкретної транскрипції"""
    current_user = get_current_user_from_token()
    
    if not current_user:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        transcription = Transcription.query.filter_by(
            uuid=transcription_uuid,
            user_id=current_user.id
        ).first()
        
        if not transcription:
            return jsonify({'error': 'Transcription not found'}), 404
            
        return jsonify({
            'status': 'success',
            'transcription': transcription.to_dict()
        })
        
    except Exception as e:
        app.logger.error(f"Error getting transcription: {str(e)}")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5070)
