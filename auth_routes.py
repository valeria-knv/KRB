from flask import Blueprint, request, jsonify, redirect, url_for, render_template_string
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from email_service import email_service
import jwt
import os
from datetime import datetime, timedelta
from functools import wraps


auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

JWT_SECRET_RAM = os.getenv('JWT_SECRET')
JWT_SECRET = str(JWT_SECRET_RAM)

print(f"JWT_SECRET type: {type(JWT_SECRET)}, value: {JWT_SECRET[:10]}...")

def token_required(f):
    """Декоратор для захищених маршрутів"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            user_id = data['user_id']
            
            current_user = User.query.filter_by(id=user_id).first()
            
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
            
            if not current_user.is_active:
                return jsonify({'error': 'User account is deactivated'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
        except Exception as e:
            print(f"Token validation error: {str(e)}")
            return jsonify({'message': 'Token validation failed'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated


def verified_required(f):
    """Декоратор для перевірки верифікації електронної пошти"""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if not current_user.is_verified:
            return jsonify({
                'error': 'Email verification required',
                'message': 'Please verify your email address before using this feature'
            }), 403
        
        return f(current_user, *args, **kwargs)
    
    return decorated


def generate_token(user):
    """Генерує JWT токен для користувача"""
    try:
        expiration_time = datetime.datetime.utcnow() + datetime.timedelta(days=7)
        exp_timestamp = int(expiration_time.timestamp())
        
        payload = {
            'user_id': user.id, 
            'email': user.email,
            'exp': exp_timestamp 
        }
        
        print(f"Payload для JWT: {payload}")
        
        token = jwt.encode(payload, JWT_SECRET, algorithm='HS256')
        
        if isinstance(token, bytes):
            token = token.decode('utf-8')
            
        print(f"Token generated successfully: {token[:50]}...")
        return token
    except Exception as e:
        print(f"Token generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        username = data.get('username', '').strip()
        
        print(f"Registration attempt for email: {email}")
        
        if not email or not password:
            return jsonify({
                'status': 'error',
                'message': 'Email and password are required'
            }), 400
        
        if len(password) < 6:
            return jsonify({
                'status': 'error',
                'message': 'Password must be at least 6 characters long'
            }), 400
        
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({
                'status': 'error',
                'message': 'User with this email already exists'
            }), 409
        
        if username:
            existing_username = User.query.filter_by(username=username).first()
            if existing_username:
                return jsonify({
                    'status': 'error',
                    'message': 'Username already taken'
                }), 409
        
        user = User(
            email=email,
            username=username if username else None
        )
        user.set_password(password)
        
        verification_token = user.generate_verification_token()
        
        db.session.add(user)
        db.session.commit()
        
        email_sent = email_service.send_verification_email(
            user.email, 
            verification_token, 
            user.username
        )
        
        if not email_sent:
            print(f"Warning: Failed to send verification email to {user.email}")
        
        return jsonify({
            'status': 'success',
            'message': 'User registered successfully. Please check your email to verify your account.',
            'user': {
                'email': user.email,
                'username': user.username,
                'is_verified': user.is_verified
            },
            'email_sent': email_sent,
            'redirect_to_login': True
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f'Registration failed: {str(e)}'
        }), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        print(f"Login attempt for email: {email}")
        
        if not email or not password:
            return jsonify({
                'status': 'error',
                'message': 'Email and password are required'
            }), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            print(f"User not found for email: {email}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid email or password'
            }), 401
        
        print(f"User found: {user.email}, ID: {user.id}")
        
        if not user.check_password(password):
            print("Password check failed")
            return jsonify({
                'status': 'error',
                'message': 'Invalid email or password'
            }), 401
        
        if not user.is_active:
            return jsonify({
                'status': 'error',
                'message': 'Account is deactivated'
            }), 401
        
        user.last_login_at = datetime.utcnow()
        db.session.commit()
        
        token_payload = {
            'user_id': user.id,
            'email': user.email,
            'exp': datetime.utcnow() + timedelta(days=7)  # Токен дійсний 7 днів
        }

        token = jwt.encode(token_payload, JWT_SECRET, algorithm='HS256')
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'user': user.to_dict(),
            'token': token
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f'Login failed: {str(e)}'
        }), 500


@auth_bp.route('/verify-email', methods=['GET'])
def verify_email():
    """Верифікація електронної пошти"""
    try:
        token = request.args.get('token')
        
        if not token:
            return render_template_string("""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Помилка верифікації</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: #e74c3c; }
                </style>
            </head>
            <body>
                <h1 class="error">❌ Помилка верифікації</h1>
                <p>Токен верифікації не знайдено.</p>
                <a href="http://localhost:3000">Повернутися на головну</a>
            </body>
            </html>
            """), 400
        
        user = User.query.filter_by(email_verification_token=token).first()
        
        if not user:
            return render_template_string("""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Помилка верифікації</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: #e74c3c; }
                </style>
            </head>
            <body>
                <h1 class="error">❌ Невірний токен</h1>
                <p>Токен верифікації недійсний або застарілий.</p>
                <a href="http://localhost:3000">Повернутися на головну</a>
            </body>
            </html>
            """), 400
        
        if not user.is_verification_token_valid(token):
            return render_template_string("""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Токен застарілий</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: #e74c3c; }
                </style>
            </head>
            <body>
                <h1 class="error">⏰ Токен застарілий</h1>
                <p>Токен верифікації застарілий. Будь ласка, запросіть новий лист верифікації.</p>
                <a href="http://localhost:3000">Повернутися на головну</a>
            </body>
            </html>
            """), 400
        
        if user.is_verified:
            return render_template_string("""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Вже верифіковано</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .success { color: #27ae60; }
                </style>
            </head>
            <body>
                <h1 class="success">✅ Вже верифіковано</h1>
                <p>Ваша електронна пошта вже підтверджена.</p>
                <a href="http://localhost:3000">Перейти до додатку</a>
            </body>
            </html>
            """)
        
        user.verify_email()
        db.session.commit()
        
        return render_template_string("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Верифікація успішна</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: #27ae60; }
                .button { 
                    display: inline-block; 
                    background: #3498db; 
                    color: white; 
                    padding: 10px 20px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <h1 class="success">✅ Верифікація успішна!</h1>
            <p>Ваша електронна пошта успішно підтверджена. Тепер ви можете користуватися всіма функціями додатку.</p>
            <a href="http://localhost:3000" class="button">Перейти до додатку</a>
        </body>
        </html>
        """)
        
    except Exception as e:
        print(f"Email verification error: {str(e)}")
        return render_template_string("""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Помилка сервера</title>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .error { color: #e74c3c; }
            </style>
        </head>
        <body>
            <h1 class="error">❌ Помилка сервера</h1>
            <p>Виникла помилка при верифікації. Спробуйте пізніше.</p>
            <a href="http://localhost:3000">Повернутися на головну</a>
        </body>
        </html>
        """), 500

@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Повторна відправка листа верифікації"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.is_verified:
            return jsonify({'error': 'Email is already verified'}), 400
        
        verification_token = user.generate_verification_token()
        db.session.commit()
        
        email_sent = email_service.send_verification_email(
            user.email, 
            verification_token, 
            user.username
        )
        
        if not email_sent:
            return jsonify({'error': 'Failed to send verification email'}), 500
        
        return jsonify({
            'status': 'success',
            'message': 'Verification email sent successfully'
        })
        
    except Exception as e:
        print(f"Resend verification error: {str(e)}")
        return jsonify({'error': 'Failed to resend verification email'}), 500


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Отримує інформацію про поточного користувача"""
    return jsonify({
        'status': 'success',
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """Вихід з системи (на клієнті потрібно видалити токен)"""
    return jsonify({
        'status': 'success',
        'message': 'Logged out successfully'
    }), 200

@auth_bp.route('/test-jwt', methods=['GET'])
def test_jwt():
    """Тестовий маршрут для перевірки роботи JWT"""
    try:
        exp_time = datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
        test_payload = {
            'user_id': 1,
            'test': 'data',
            'exp': int(exp_time.timestamp()) 
        }
        
        print(f"Test payload: {test_payload}")
        
        test_token = jwt.encode(test_payload, JWT_SECRET, algorithm='HS256')
        
        decoded = jwt.decode(test_token, JWT_SECRET, algorithms=['HS256'])
        
        return jsonify({
            'status': 'success',
            'message': 'JWT working correctly',
            'jwt_version': getattr(jwt, '__version__', 'unknown'),
            'test_token': test_token if isinstance(test_token, str) else test_token.decode('utf-8'),
            'decoded': decoded
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': f'JWT test failed: {str(e)}',
            'jwt_available': 'jwt' in globals()
        }), 500


@auth_bp.route('/simple-test', methods=['GET'])
def simple_test():
    """Найпростіший тест JWT"""
    try:
        payload = {
            'user_id': 123,
            'exp': int(datetime.time()) + 3600 
        }
        
        token = jwt.encode(payload, 'secret', algorithm='HS256')
        
        decoded = jwt.decode(token, 'secret', algorithms=['HS256'])
        
        return jsonify({
            'status': 'success',
            'original': payload,
            'token': token,
            'decoded': decoded
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500
