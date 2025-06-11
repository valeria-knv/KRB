"""
Сервіс для відправки електронних листів
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from dotenv import load_dotenv
from flask import url_for
import secrets

load_dotenv()

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.email_address = os.getenv('EMAIL_ADDRESS')
        self.email_password = os.getenv('EMAIL_PASSWORD')
        self.app_name = os.getenv('APP_NAME', 'Transcription App')
        self.base_url = os.getenv('BASE_URL', 'http://localhost:5070')
        
        if not self.email_address or not self.email_password:
            raise ValueError("EMAIL_ADDRESS та EMAIL_PASSWORD повинні бути встановлені в .env файлі")
    
    def send_email(self, to_email, subject, html_content, text_content=None):
        """Відправляє електронний лист"""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.app_name} <{self.email_address}>"
            message["To"] = to_email
            
            if text_content:
                text_part = MIMEText(text_content, "plain", "utf-8")
                message.attach(text_part)
            
            html_part = MIMEText(html_content, "html", "utf-8")
            message.attach(html_part)
            
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.email_address, self.email_password)
                server.sendmail(self.email_address, to_email, message.as_string())
            
            print(f"✅ Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Error sending email to {to_email}: {str(e)}")
            return False
    
    def send_verification_email(self, user_email, verification_token, username=None):
        """Відправляє лист для верифікації електронної пошти"""
        verification_url = f"{self.base_url}/auth/verify-email?token={verification_token}"
        
        display_name = username if username else user_email.split('@')[0]
        
        subject = f"Підтвердіть вашу електронну пошту - {self.app_name}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Підтвердження електронної пошти</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .container {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e0e0e0;
                }}
                .logo {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 10px;
                }}
                .subtitle {{
                    color: #7f8c8d;
                    font-size: 16px;
                }}
                .content {{
                    margin-bottom: 30px;
                }}
                .greeting {{
                    font-size: 18px;
                    margin-bottom: 20px;
                    color: #2c3e50;
                }}
                .message {{
                    margin-bottom: 25px;
                    line-height: 1.8;
                }}
                .verify-button {{
                    display: inline-block;
                    background-color: #3498db;
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    font-size: 16px;
                    margin: 20px 0;
                    transition: background-color 0.3s;
                }}
                .verify-button:hover {{
                    background-color: #2980b9;
                }}
                .alternative-link {{
                    background-color: #ecf0f1;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    word-break: break-all;
                    font-family: monospace;
                    font-size: 14px;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e0e0e0;
                    text-align: center;
                    color: #7f8c8d;
                    font-size: 14px;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎙️ {self.app_name}</div>
                    <div class="subtitle">Система транскрибування аудіо</div>
                </div>
                
                <div class="content">
                    <div class="greeting">Привіт, {display_name}!</div>
                    
                    <div class="message">
                        Дякуємо за реєстрацію в {self.app_name}! Для завершення процесу реєстрації, 
                        будь ласка, підтвердіть вашу електронну пошту, натиснувши на кнопку нижче.
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{verification_url}" class="verify-button">
                            ✅ Підтвердити електронну пошту
                        </a>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Важливо:</strong> Це посилання дійсне протягом 24 годин. 
                        Після цього часу вам потрібно буде запросити нове посилання для підтвердження.
                    </div>
                    
                    <div class="message">
                        Якщо кнопка не працює, скопіюйте та вставте це посилання у ваш браузер:
                    </div>
                    
                    <div class="alternative-link">
                        {verification_url}
                    </div>
                    
                    <div class="message">
                        Якщо ви не реєструвалися в {self.app_name}, просто проігноруйте цей лист.
                    </div>
                </div>
                
                <div class="footer">
                    <p>З повагою,<br>Команда {self.app_name}</p>
                    <p style="font-size: 12px; color: #95a5a6;">
                        Цей лист було відправлено автоматично. Будь ласка, не відповідайте на нього.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Текстова версія листа
        text_content = f"""
        Привіт, {display_name}!
        
        Дякуємо за реєстрацію в {self.app_name}!
        
        Для завершення процесу реєстрації, будь ласка, підтвердіть вашу електронну пошту, 
        перейшовши за цим посиланням:
        
        {verification_url}
        
        Це посилання дійсне протягом 24 годин.
        
        Якщо ви не реєструвалися в {self.app_name}, просто проігноруйте цей лист.
        
        З повагою,
        Команда {self.app_name}
        """
        
        return self.send_email(user_email, subject, html_content, text_content)
    
    def send_password_reset_email(self, user_email, reset_token, username=None):
        """Відправляє лист для скидання паролю"""
        reset_url = f"{self.base_url}/auth/reset-password?token={reset_token}"
        
        display_name = username if username else user_email.split('@')[0]
        
        subject = f"Скидання паролю - {self.app_name}"
        
        # HTML версія листа
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Скидання паролю</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f4f4f4;
                }}
                .container {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e0e0e0;
                }}
                .logo {{
                    font-size: 28px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-bottom: 10px;
                }}
                .subtitle {{
                    color: #7f8c8d;
                    font-size: 16px;
                }}
                .content {{
                    margin-bottom: 30px;
                }}
                .greeting {{
                    font-size: 18px;
                    margin-bottom: 20px;
                    color: #2c3e50;
                }}
                .message {{
                    margin-bottom: 25px;
                    line-height: 1.8;
                }}
                .reset-button {{
                    display: inline-block;
                    background-color: #e74c3c;
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                    font-size: 16px;
                    margin: 20px 0;
                    transition: background-color 0.3s;
                }}
                .reset-button:hover {{
                    background-color: #c0392b;
                }}
                .alternative-link {{
                    background-color: #ecf0f1;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    word-break: break-all;
                    font-family: monospace;
                    font-size: 14px;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e0e0e0;
                    text-align: center;
                    color: #7f8c8d;
                    font-size: 14px;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎙️ {self.app_name}</div>
                    <div class="subtitle">Система транскрибування аудіо</div>
                </div>
                
                <div class="content">
                    <div class="greeting">Привіт, {display_name}!</div>
                    
                    <div class="message">
                        Ми отримали запит на скидання паролю для вашого акаунту в {self.app_name}. 
                        Якщо це були ви, натисніть на кнопку нижче, щоб створити новий пароль.
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="reset-button">
                            🔑 Скинути пароль
                        </a>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Важливо:</strong> Це посилання дійсне протягом 1 години. 
                        Після цього часу вам потрібно буде запросити нове посилання для скидання паролю.
                    </div>
                    
                    <div class="message">
                        Якщо кнопка не працює, скопіюйте та вставте це посилання у ваш браузер:
                    </div>
                    
                    <div class="alternative-link">
                        {reset_url}
                    </div>
                    
                    <div class="message">
                        Якщо ви не запитували скидання паролю, просто проігноруйте цей лист. 
                        Ваш пароль залишиться незмінним.
                    </div>
                </div>
                
                <div class="footer">
                    <p>З повагою,<br>Команда {self.app_name}</p>
                    <p style="font-size: 12px; color: #95a5a6;">
                        Цей лист було відправлено автоматично. Будь ласка, не відповідайте на нього.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Текстова версія листа
        text_content = f"""
        Привіт, {display_name}!
        
        Ми отримали запит на скидання паролю для вашого акаунту в {self.app_name}.
        
        Якщо це були ви, перейдіть за цим посиланням, щоб створити новий пароль:
        
        {reset_url}
        
        Це посилання дійсне протягом 1 години.
        
        Якщо ви не запитували скидання паролю, просто проігноруйте цей лист.
        
        З повагою,
        Команда {self.app_name}
        """
        
        return self.send_email(user_email, subject, html_content, text_content)

# Ініціалізуємо сервіс
email_service = EmailService()
