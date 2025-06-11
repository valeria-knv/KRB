from flask import Blueprint, request, jsonify
from models import db, User, Audio, Transcription
from auth_routes import token_required
from sqlalchemy import desc

transcription_bp = Blueprint('transcriptions', __name__, url_prefix='/transcriptions')

@transcription_bp.route('/history', methods=['GET'])
@token_required
def get_user_transcription_history(current_user):
    """Отримує історію транскрибування для поточного користувача"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')
        
        query = Transcription.query.filter_by(user_id=current_user.id)
        
        if status:
            query = query.filter_by(status=status)
        
        query = query.order_by(desc(Transcription.created_at))
        
        transcriptions = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        result = []
        for transcription in transcriptions.items:
            transcription_data = transcription.to_dict()
            
            if transcription.audio:
                transcription_data['audio'] = transcription.audio.to_dict()
            
            result.append(transcription_data)
        
        return jsonify({
            'status': 'success',
            'transcriptions': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': transcriptions.total,
                'pages': transcriptions.pages,
                'has_next': transcriptions.has_next,
                'has_prev': transcriptions.has_prev
            }
        })
        
    except Exception as e:
        print(f"Error getting transcription history: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@transcription_bp.route('/<transcription_uuid>', methods=['GET'])
@token_required
def get_transcription_details(current_user, transcription_uuid):
    """Отримує детальну інформацію про конкретну транскрипцію"""
    try:
        transcription = Transcription.query.filter_by(
            uuid=transcription_uuid,
            user_id=current_user.id
        ).first()
        
        if not transcription:
            return jsonify({
                'status': 'error',
                'message': 'Transcription not found'
            }), 404
        
        transcription_data = transcription.to_dict()
        
        if transcription.audio:
            transcription_data['audio'] = transcription.audio.to_dict()
        
        return jsonify({
            'status': 'success',
            'transcription': transcription_data
        })
        
    except Exception as e:
        print(f"Error getting transcription details: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@transcription_bp.route('/<transcription_uuid>', methods=['PUT'])
@token_required
def update_transcription(current_user, transcription_uuid):
    """Оновлює текст транскрипції"""
    try:
        transcription = Transcription.query.filter_by(
            uuid=transcription_uuid,
            user_id=current_user.id
        ).first()
        
        if not transcription:
            return jsonify({
                'status': 'error',
                'message': 'Transcription not found'
            }), 404
        
        data = request.get_json()
        
        if 'text' in data:
            transcription.text = data['text']
            transcription.is_edited = True
        
        if 'speakers_text' in data:
            transcription.speakers_text = data['speakers_text']
            transcription.is_edited = True
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Transcription updated successfully',
            'transcription': transcription.to_dict()
        })
        
    except Exception as e:
        print(f"Error updating transcription: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@transcription_bp.route('/<transcription_uuid>', methods=['DELETE'])
@token_required
def delete_transcription(current_user, transcription_uuid):
    """Видаляє транскрипцію"""
    try:
        transcription = Transcription.query.filter_by(
            uuid=transcription_uuid,
            user_id=current_user.id
        ).first()
        
        if not transcription:
            return jsonify({
                'status': 'error',
                'message': 'Transcription not found'
            }), 404
        
        if transcription.audio:
            audio = transcription.audio
            import os
            if audio.file_path and os.path.exists(audio.file_path):
                try:
                    os.remove(audio.file_path)
                except Exception as e:
                    print(f"Error removing audio file: {str(e)}")
            
            db.session.delete(audio)
        
        db.session.delete(transcription)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Transcription deleted successfully'
        })
        
    except Exception as e:
        print(f"Error deleting transcription: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
