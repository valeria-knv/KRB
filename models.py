import json
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import JSON
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_migrate import Migrate
import uuid as uuid_lib
from datetime import datetime, timedelta
import secrets


db = SQLAlchemy()

class User(db.Model):
    """Таблиця користувачів для авторизації"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(UUID(as_uuid=True), unique=True, nullable=False, default=uuid_lib.uuid4)
    
    # Основна інформація
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=True)
    
    # Аутентифікація
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Статус акаунту
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    is_admin = db.Column(db.Boolean, default=False)

    # Верифікація електронної пошти
    email_verification_token = db.Column(db.String(255), nullable=True)
    email_verification_sent_at = db.Column(db.DateTime, nullable=True)
    email_verified_at = db.Column(db.DateTime, nullable=True)
    
    # Скидання паролю
    password_reset_token = db.Column(db.String(255), nullable=True)
    password_reset_sent_at = db.Column(db.DateTime, nullable=True)
    
    # Метадані
    last_login_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Зв'язки з іншими таблицями
    audio_files = db.relationship('Audio', backref='user', lazy=True, cascade='all, delete-orphan')
    transcriptions = db.relationship('Transcription', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Встановлює хешований пароль"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Перевіряє пароль"""
        return check_password_hash(self.password_hash, password)
    
    def generate_verification_token(self):
        """Генерує токен для верифікації електронної пошти"""
        self.email_verification_token = secrets.token_urlsafe(32)
        self.email_verification_sent_at = datetime.utcnow()
        return self.email_verification_token
    
    def generate_password_reset_token(self):
        """Генерує токен для скидання паролю"""
        self.password_reset_token = secrets.token_urlsafe(32)
        self.password_reset_sent_at = datetime.utcnow()
        return self.password_reset_token
    
    def is_verification_token_valid(self, token):
        """Перевіряє, чи дійсний токен верифікації (24 години)"""
        if not self.email_verification_token or self.email_verification_token != token:
            return False
        
        if not self.email_verification_sent_at:
            return False
        
        # Токен дійсний 24 години
        expiry_time = self.email_verification_sent_at + timedelta(hours=24)
        return datetime.utcnow() <= expiry_time
    
    def is_password_reset_token_valid(self, token):
        """Перевіряє, чи дійсний токен скидання паролю (1 година)"""
        if not self.password_reset_token or self.password_reset_token != token:
            return False
        
        if not self.password_reset_sent_at:
            return False
        
        # Токен дійсний 1 годину
        expiry_time = self.password_reset_sent_at + timedelta(hours=1)
        return datetime.utcnow() <= expiry_time
    
    def verify_email(self):
        """Підтверджує електронну пошту"""
        self.is_verified = True
        self.email_verified_at = datetime.utcnow()
        self.email_verification_token = None
        self.email_verification_sent_at = None
    
    def reset_password(self, new_password):
        """Скидає пароль"""
        self.set_password(new_password)
        self.password_reset_token = None
        self.password_reset_sent_at = None
    
    def to_dict(self, include_sensitive=False):
        data = {
            'id': str(self.uuid),
            'email': self.email,
            'username': self.username,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'is_admin': self.is_admin,
            'email_verified_at': self.email_verified_at.isoformat() if self.email_verified_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
        if include_sensitive:
            data.update({
                'password_hash': self.password_hash,
                'email_verification_token': self.email_verification_token,
                'password_reset_token': self.password_reset_token
            })
            
        return data
    
    def __repr__(self):
        return f"<User {self.email}>"


class Audio(db.Model):
    """Зберігає інформацію про аудіофайли"""
    __tablename__ = 'audio'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(UUID(as_uuid=True), unique=True, nullable=False, default=uuid_lib.uuid4)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=True) 
    duration = db.Column(db.Float, nullable=True)  
    format = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Зв'язки з іншими таблицями
    transcriptions = db.relationship('Transcription', backref='audio', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': str(self.uuid),
            'user_id': str(self.user.uuid) if self.user else None,
            'filename': self.filename,
            'file_size': self.file_size,
            'duration': self.duration,
            'format': self.format,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f"<Audio {self.filename}>"


class Transcription(db.Model):
    """Зберігає результати транскрибування аудіо"""
    __tablename__ = 'transcription'

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(UUID(as_uuid=True), unique=True, nullable=False, default=uuid_lib.uuid4)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    audio_id = db.Column(db.Integer, db.ForeignKey('audio.id'), nullable=False)
    
    # Текст транскрипції
    text = db.Column(db.Text, nullable=True)
    speakers_text = db.Column(db.Text, nullable=True) 
    speakers_json = db.Column(JSONB, nullable=True) 
    
    # Метадані
    language = db.Column(db.String(50), nullable=True) 
    
    # Статус і версійність
    status = db.Column(db.String(50), default="pending")
    is_edited = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def generate_share_token(self):
        """Генерує токен для публічного доступу"""
        import secrets
        self.share_token = secrets.token_urlsafe(32)
        self.is_shared = True
        db.session.commit()
        return self.share_token
    
    def to_dict(self):
        return {
            'id': str(self.uuid),
            'user_id': str(self.user.uuid) if self.user else None,
            'audio_id': str(self.audio.uuid) if self.audio else None,
            'text': self.text,
            'speakers_text': self.speakers_text,
            'speakers': self.speakers_json,
            'language': self.language,
            'status': self.status,
            'is_edited': self.is_edited,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f"<Transcription {self.uuid}>"