import os
import time
import logging
import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class LLMWorker():
	def __init__(self, aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID'), 
			  aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'), 
			  region_name= os.getenv('AWS_REGION')):
		self.client = boto3.client(
			"bedrock-runtime", 
			aws_access_key_id = aws_access_key_id, 
			aws_secret_access_key = aws_secret_access_key, 
			region_name = region_name
			)
		self.max_retries = 3
		self.initial_retry_delay = 2
	
	def _invoke_model_with_retry(self, conversation, model_id, inference_config):
		retry_delay = self.initial_retry_delay
        
		for attempt in range(self.max_retries):
			try:
				response = self.client.converse(
					modelId=model_id,
					messages=conversation,
					inferenceConfig=inference_config,
					additionalModelRequestFields={}
				)
				return response["output"]["message"]["content"][0]["text"]
			
			except ClientError as e:
				if e.response['Error']['Code'] == 'ThrottlingException':
					logger.warning(
						f"Throttling detected (attempt {attempt + 1}/{self.max_retries}), "
						f"retrying in {retry_delay} seconds..."
					)
					time.sleep(retry_delay)
					retry_delay *= 2  # Exponential backoff
					continue
				logger.error(f"AWS ClientError: {str(e)}")
				raise
			except Exception as e:
				logger.error(f"Unexpected error: {str(e)}")
				raise
        
		raise Exception(f"Max retries ({self.max_retries}) reached for model {model_id}")


	def _truncate_text(self, text, max_length=8000):
		if len(text) > max_length:
			logger.warning(f"Truncating text from {len(text)} to {max_length} characters")
			return text[:max_length] + "\n...[текст обрізано через обмеження довжини]"
		return text


	def create_summary_prompt(self, conversation_text, model_id = os.getenv('AWS_MODEL_NAME')):
		conversation_text = self._truncate_text(conversation_text)
		
		prompt_text = (
            "Please create a detailed summary of this conversation. "
            "Structure the summary as follows:\n\n"
            "1. First, describe each speaker briefly (e.g., SPEAKER_00: [brief description based on their speech patterns and topics])\n"
            "2. Then provide a comprehensive summary of the conversation covering:\n"
            "   - Main topics discussed\n"
            "   - Key decisions or agreements made\n"
            "   - Important information shared\n"
            "   - Action items or next steps mentioned\n"
            "   - Overall tone and context of the conversation\n\n"
            "Make each paragraph at least 3-4 sentences and focus on the most important content. "
            "Write in a clear, professional style suitable for general business or personal conversations."
        )
		conversation = [
            {
                "role": "user",
                "content": [{"text": prompt_text}, {"text": conversation_text}],
            }
		]
		
		inference_config = {
            "maxTokens": 2048,
            "stopSequences": ["User:"],
            "temperature": 0.7,
            "topP": 0.9
        }
		try:
			return self._invoke_model_with_retry(conversation, model_id, inference_config)
		except Exception as e:
			logger.error(f"Failed to create summary: {str(e)}")
			return None


	def analyze_conversation_text(self, conversation_text, model_id = os.getenv('AWS_MODEL_NAME')):
		conversation_text = self._truncate_text(conversation_text)
		
		prompt_text = (
			"Analyze this conversation and extract key information in the following structured format:\n\n"
			"CONVERSATION DETAILS\n"
			"Date/Time: [Extract if mentioned]\n"
			"Duration: [Estimate based on content]\n"
			"Type: [Meeting, Phone call, Casual conversation, etc.]\n"
			"Language: [Primary language used]\n\n"
			"PARTICIPANTS\n"
			"Speaker 1: [Name if mentioned, otherwise description]\n"
			"Speaker 2: [Name if mentioned, otherwise description]\n"
			"[Additional speakers if present]\n\n"
			"MAIN TOPICS\n"
			"Primary Topic: [Main subject discussed]\n"
			"Secondary Topics: [Other important subjects]\n"
			"Keywords: [Important terms, names, places mentioned]\n\n"
			"KEY INFORMATION\n"
			"Decisions Made: [Any decisions or agreements]\n"
			"Action Items: [Tasks or follow-ups mentioned]\n"
			"Important Dates: [Dates, deadlines, appointments]\n"
			"Contact Information: [Phone numbers, emails, addresses if mentioned]\n"
			"References: [Documents, websites, other resources mentioned]\n\n"
			"CONVERSATION TONE\n"
			"Overall Mood: [Professional, casual, friendly, tense, etc.]\n"
			"Relationship: [Business partners, friends, family, etc.]\n"
			"Purpose: [Information sharing, planning, problem-solving, etc.]"
		)
		
		conversation = [
			{
				"role": "user",
				"content": [{"text": prompt_text}, {"text": conversation_text}],
			}
		]
		
		inference_config = {
			"maxTokens": 2048,
			"stopSequences": ["User:"],
			"temperature": 0.5, 
			"topP": 0.8
		}
		
		try:
			return self._invoke_model_with_retry(conversation, model_id, inference_config)
		except Exception as e:
			logger.error(f"Failed to analyze medical text: {str(e)}")
			return None	


	def extract_action_items(self, conversation_text, model_id = os.getenv('AWS_MODEL_NAME')):
		conversation_text = self._truncate_text(conversation_text)
		
		prompt_text = (
			"Extract all action items, tasks, and follow-ups from this conversation. "
			"Format the response as a clear list:\n\n"
			"ACTION ITEMS:\n"
			"1. [Task description] - Assigned to: [Person] - Deadline: [Date if mentioned]\n"
			"2. [Task description] - Assigned to: [Person] - Deadline: [Date if mentioned]\n\n"
			"FOLLOW-UP MEETINGS:\n"
			"- [Meeting description] - Date: [Date if mentioned] - Participants: [Who should attend]\n\n"
			"DEADLINES AND IMPORTANT DATES:\n"
			"- [Date] - [What needs to be done]\n\n"
			"CONTACT INFORMATION TO FOLLOW UP:\n"
			"- [Name] - [Contact details if mentioned] - [Reason for contact]\n\n"
			"If no action items are found in any category, write 'None identified' for that section."
		)
		
		conversation = [
			{
				"role": "user",
				"content": [{"text": prompt_text}, {"text": conversation_text}],
			}
		]
		
		inference_config = {
			"maxTokens": 1024,
			"stopSequences": ["User:"],
			"temperature": 0.3,
			"topP": 0.7
		}
		
		try:
			return self._invoke_model_with_retry(conversation, model_id, inference_config)
		except Exception as e:
			logger.error(f"Failed to extract action items: {str(e)}")
			return None


	def generate_meeting_minutes(self, conversation_text, model_id = os.getenv('AWS_MODEL_NAME')):
		conversation_text = self._truncate_text(conversation_text)
		
		prompt_text = (
			"Create professional meeting minutes from this conversation in the following format:\n\n"
			"MEETING MINUTES\n"
			"Date: [Extract or estimate]\n"
			"Participants: [List all speakers]\n"
			"Duration: [Estimate based on content]\n\n"
			"AGENDA ITEMS DISCUSSED:\n"
			"1. [Topic 1]\n"
			"   - Discussion points\n"
			"   - Decisions made\n"
			"   - Action items\n\n"
			"2. [Topic 2]\n"
			"   - Discussion points\n"
			"   - Decisions made\n"
			"   - Action items\n\n"
			"DECISIONS MADE:\n"
			"- [Decision 1]\n"
			"- [Decision 2]\n\n"
			"ACTION ITEMS:\n"
			"- [Action item] - Responsible: [Person] - Due: [Date]\n\n"
			"NEXT STEPS:\n"
			"- [Next step 1]\n"
			"- [Next step 2]\n\n"
			"Write in a professional, clear style suitable for business documentation."
		)
		
		conversation = [
			{
				"role": "user",
				"content": [{"text": prompt_text}, {"text": conversation_text}],
			}
		]
		
		inference_config = {
			"maxTokens": 2048,
			"stopSequences": ["User:"],
			"temperature": 0.4,
			"topP": 0.8
		}
		
		try:
			return self._invoke_model_with_retry(conversation, model_id, inference_config)
		except Exception as e:
			logger.error(f"Failed to generate meeting minutes: {str(e)}")
			return None


	def analyze_conversation_sentiment(self, conversation_text, model_id = os.getenv('AWS_MODEL_NAME')):
		conversation_text = self._truncate_text(conversation_text)
		
		prompt_text = (
			"Analyze the emotional tone and mood of this conversation:\n\n"
			"MOOD ANALYSIS\n"
			"Overall Tone: [Positive/Neutral/Negative]\n"
			"Formality Level: [Formal/Informal/Mixed]\n"
			"Emotional Intensity: [Low/Medium/High]\n\n"
			"Each Speaker's MOOD:\n"
			"SPEAKER_00: [Description of mood and emotional state]\n"
			"SPEAKER_01: [Description of mood and emotional state]\n\n"
			"KEY EMOTIONAL MOMENTS:\n"
			"- [Moment 1]: [Description of emotional change or important moment]\n"
			"- [Moment 2]: [Description of emotional change or important moment]\n\n"
			"RECOMMENDATIONS:\n"
			"- [Recommendation for further communication or action based on analysis]"
		)
		
		conversation = [
			{
				"role": "user",
				"content": [{"text": prompt_text}, {"text": conversation_text}],
			}
		]
		
		inference_config = {
			"maxTokens": 2048,
			"stopSequences": ["User:"],
			"temperature": 0.6, 
			"topP": 0.8
		}
		
		try:
			return self._invoke_model_with_retry(conversation, model_id, inference_config)
		except Exception as e:
			logger.error(f"Failed to analyze medical text: {str(e)}")
			return None		
	

conversation_text = '''
Good morning, this is Dr. Emily Hart from the Respiratory Medicine Department at St. Thomas' Hospital in London. I am calling to make a patient referral that requires urgent attention.

The patient's name is Mr. James Edward Cartwright. He is a 64-year-old male, born on 3rd February 1959, with NHS number 2345678901. This referral has been flagged as urgent due to the severity of his symptoms and the need for immediate specialist intervention.

Mr. Cartwright presented to our A&E department earlier today with worsening shortness of breath, persistent cough with blood-streaked sputum, and pleuritic chest pain over the past five days. A CT scan performed earlier revealed a large left-sided pleural effusion, likely malignant, and mediastinal lymphadenopathy. His oxygen saturation on room air was 88%, and he is currently on supplemental oxygen. His medical history includes chronic obstructive pulmonary disease, a 40-pack-year smoking history, and hypertension. 

I have initiated a pleural tap, and 50ml of fluid has been sent for cytology and biochemistry. However, he urgently requires a respiratory specialist for further management, including consideration for thoracoscopy and biopsy. 

For your reference, he is currently stable but remains at risk of clinical deterioration. I strongly recommend his admission under the respiratory team for immediate assessment and intervention.

You can contact me directly if there are any questions or additional details required. My bleep number is 5678, and for urgent matters, I can be reached on my personal mobile number, 07912 345678. You may also email me at emily.hart@stthomas.nhs.uk for follow-up or documentation. 

For the record, my full name is Dr. Emily Hart. I am a Consultant in Respiratory Medicine at St. Thomas' Hospital. The referral has been initiated from our A&E Department under the Respiratory Medicine Service. Please ensure this is actioned promptly, as this is a high-priority case.

Thank you for your attention, and please do not hesitate to get in touch if you require further clarification or documentation. I will follow up tomorrow to ensure the referral has been processed."
'''

worker = LLMWorker()
    
summary = worker.create_summary_prompt(conversation_text)
print("Summary:")
# print(summary)

# conversation_structure = worker.analyze_conversation_text(conversation_text)
# print("\nConversation Structure:")
# print(conversation_structure)

# action_items = worker.extract_action_items(conversation_text)
# print("\nAction Items:")
# print(action_items)

# meeting_minutes = worker.generate_meeting_minutes(conversation_text)
# print("\nMeeting Minutes:")
# print(meeting_minutes)

# conversation_sentiment = worker.analyze_conversation_sentiment(conversation_text)
# print("\nConversation Sentiment:")
# print(conversation_sentiment)