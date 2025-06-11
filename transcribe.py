import os
import time
import whisper
import tempfile
import numpy as np
from pydub import AudioSegment
import json
from pyannote.audio import Pipeline
from pyannote.core import Annotation
from typing import Dict, Any, Tuple, List
import logging
from collections import defaultdict
import pprint
import torch


logger = logging.getLogger(__name__)


class Transcribe:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {self.device}")
        
        self.model = whisper.load_model("base")
        
        self.diarization_pipeline = None
        try:
            self.diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization",
                use_auth_token=os.getenv('PYANNOTE_TOKEN')
            )

            if hasattr(self.diarization_pipeline, 'instantiate_params'):
                self.diarization_pipeline.instantiate_params({
                    "segmentation": {
                        "threshold": 0.25, 
                        "min_duration": 0.1 
                    },
                    "embedding": {
                        "window": 0.75, 
                        "step": 0.2 
                    },
                    "clustering": {
                        "method": "affinity_propagation", 
                        "min_cluster_size": 2,
                        "threshold": 0.65
                    }
                })
        except Exception as e:
            print(f"Failed to initialize diarization pipeline: {str(e)}")


    def get_audio_data(self, audio_location: str) -> str:
        """Download or get local audio file"""
        try:
            if audio_location.startswith(('http://', 'https://')):
                import requests
                response = requests.get(audio_location)
                response.raise_for_status()
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
                temp_file.write(response.content)
                temp_file.close()
                return temp_file.name
            return audio_location
        except Exception as e:
            logger.error(f"Error getting audio data: {str(e)}")
            raise


    def audio_normalize(self, audio_file: str) -> str:
        """Normalize audio to 16kHz mono WAV format"""
        try:
            audio = AudioSegment.from_file(audio_file)
            audio = audio.set_frame_rate(16000).set_channels(1)

            audio = audio.normalize()

            if len(audio) > 5000: 
                audio = audio.low_pass_filter(4000) 
                audio = audio.high_pass_filter(80) 

            audio = audio.compress_dynamic_range(threshold=-20.0, ratio=2.0)

            normalized_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
            audio.export(normalized_file.name, 
                        format="wav",
                        codec="pcm_s16le", 
                        parameters=["-ar", "16000"])
            
            return normalized_file.name
        except Exception as e:
            logger.error(f"Error normalizing audio: {str(e)}")
            raise


    def audio_to_text(self, mediafile: str, model: str = 'base') -> Dict[str, Any]:
        """Transcribe audio to text using Whisper"""
        try:
            result = self.model.transcribe(
                mediafile,
                word_timestamps=True,
                fp16=(self.device == "cuda"),
                temperature=1,
            )

            audio = AudioSegment.from_file(mediafile)
            audio_duration = len(audio) / 1000.0 

            return {
                'text': result['text'],
                'segments': result['segments'],
                'language': result['language']
            }
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise


    def audio_to_vtt(self, transcription: Dict[str, Any]) -> str:
        """Convert transcription to WebVTT format"""
        vtt = "WEBVTT\n\n"
        for segment in transcription['segments']:
            start = self.format_time(segment['start'])
            end = self.format_time(segment['end'])
            text = segment['text']
            vtt += f"{start} --> {end}\n{text}\n\n"
        return vtt


    def format_time(self, seconds: float) -> str:
        """Format seconds to VTT time format"""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:06.3f}"
    

    def check_audio_quality(self, audio_file: str) -> dict:
        """Check audio for potential issues affecting diarization"""
        try:
            if not isinstance(audio_file, (str, os.PathLike)):
                print(f"Invalid audio_file type: {type(audio_file)}")
                return {"error": f"Expected file path, got {type(audio_file)}"}
            
            audio_file = str(audio_file)
            
            if not os.path.exists(audio_file):
                print(f"Audio file does not exist: {audio_file}")
                return {"error": "File not found"}
            
            file_size = os.path.getsize(audio_file)
            if file_size == 0:
                print("Audio file is empty")
                return {"error": "Empty file"}
            
            print(f"Processing audio file: {audio_file} (size: {file_size} bytes)")
            
            try:
                audio = AudioSegment.from_file(audio_file)
                print("Successfully loaded audio with AudioSegment")
            except Exception as e:
                print(f"AudioSegment error: {str(e)}")
                return {"error": f"Failed to load audio: {str(e)}"}
            
            duration = len(audio) / 1000.0
            loudness = audio.dBFS
            
            try:
                samples = np.array(audio.get_array_of_samples())
                if len(samples) > 0:
                    dynamic_range = float(np.max(samples) - np.min(samples))
                else:
                    dynamic_range = 0
            except Exception as e:
                print(f"Sample analysis error: {str(e)}")
                dynamic_range = 0
            
            sample_rate = audio.frame_rate
            channels = audio.channels
            
            report = {
                "duration": duration,
                "loudness": loudness,
                "dynamic_range": dynamic_range,
                "sample_rate": sample_rate,
                "channels": channels,
                "potential_issues": []
            }
            
            if duration < 10:
                report["potential_issues"].append("Audio too short for reliable diarization")
            
            if loudness > -20:
                report["potential_issues"].append("Audio might be too loud")
            
            if loudness < -35:
                report["potential_issues"].append("Audio might be too quiet")
            
            if dynamic_range < 1000:
                report["potential_issues"].append("Low dynamic range might affect speaker separation")
            
            if sample_rate < 16000:
                report["potential_issues"].append("Sample rate too low for optimal diarization")
            
            print("\n--- Audio Quality Report ---")
            print(f"Duration: {duration:.2f} seconds")
            print(f"Loudness: {loudness:.2f} dB")
            print(f"Sample rate: {sample_rate} Hz")
            print(f"Channels: {channels}")
            if report["potential_issues"]:
                print("Potential issues:")
                for issue in report["potential_issues"]:
                    print(f"- {issue}")
            
            return report
        except Exception as e:
            print(f"Audio quality check error: {str(e)}")
            return {"error": str(e)}
        
    
    def post_process_diarization(self, diarization: Annotation) -> Annotation:
        """Покращує послідовність ідентифікації спікерів"""
        try:
            from pyannote.core import Segment
            
            segments = []
            for segment, track, speaker in diarization.itertracks(yield_label=True):
                try:
                    if hasattr(segment, 'start') and hasattr(segment, 'end'):
                        segments.append({
                            'start': float(segment.start),
                            'end': float(segment.end),
                            'speaker': speaker
                        })
                    else:
                        print(f"Invalid segment type in post_process: {type(segment)}")
                except Exception as e:
                    print(f"Error processing segment in post_process: {str(e)}")
                    continue
            
            if not segments:
                print("No valid segments found in post_process_diarization")
                return diarization
            
            segments.sort(key=lambda x: x['start'])
            
            speaker_order = {}
            current_index = 0
            
            for segment in segments:
                if segment['speaker'] not in speaker_order:
                    speaker_order[segment['speaker']] = f"SPEAKER_{current_index:02d}"
                    current_index += 1
            
            new_diarization = Annotation()
            for segment in segments:
                new_speaker = speaker_order[segment['speaker']]
                segment_obj = Segment(segment['start'], segment['end'])
                new_diarization[segment_obj] = new_speaker
            
            print(f"Post-processing: remapped {len(speaker_order)} speakers")
            for old_speaker, new_speaker in speaker_order.items():
                print(f"  {old_speaker} -> {new_speaker}")
            
            return new_diarization
        
        except Exception as e:
            print(f"Error in post_process_diarization: {str(e)}")
            return diarization
    

    def _calculate_speaker_similarity(self, features1, features2):
        """Обчислює схожість між двома наборами характеристик спікерів"""
        if not features1 or not features2:
            return 0.0
        
        avg1 = {k: np.mean([f[k] for f in features1]) for k in features1[0] if k != 'duration'}
        avg2 = {k: np.mean([f[k] for f in features2]) for k in features2[0] if k != 'duration'}
        
        squared_diff = sum((avg1[k] - avg2[k])**2 for k in avg1)
        distance = np.sqrt(squared_diff)
        
        max_possible_distance = 65535 
        similarity = 1.0 - min(distance / max_possible_distance, 1.0)
        
        return similarity
    

    def alternative_diarization(self, audio_location: str) -> Annotation:
        """Alternative approach using direct model access"""
        try:
            from pyannote.audio.pipelines import SpeakerDiarization
            from pyannote.audio import Model
            
            segmentation = Model.from_pretrained("pyannote/segmentation-3.0", 
                                                use_auth_token=os.getenv('PYANNOTE_SEGMENTATION'))
            embedding = Model.from_pretrained("pyannote/embedding-3.0", 
                                            use_auth_token=os.getenv('PYANNOTE_SEGMENTATION'))
            
            pipeline = SpeakerDiarization(segmentation=segmentation, embedding=embedding)
            
            pipeline.instantiate({
                "segmentation": {"threshold": 0.2},
                "clustering": {"method": "spectral", "min_clusters": 2, "max_clusters": 5}
            })
            
            diarization = pipeline(audio_location)
            
            return diarization
        except Exception as e:
            logger.error(f"Alternative diarization error: {str(e)}")
            raise

    
    def diagnose_diarization(self, audio_file: str) -> None:
        """Run diagnostics on diarization to identify issues"""
        try:
            print("\n=== DIARIZATION DIAGNOSTICS ===\n")
            quality_report = self.check_audio_quality(audio_file)
            
            normalized_file = self.audio_normalize(audio_file)
            
            try:
                diarization = self.diarization(normalized_file)
                speakers = set()
                for _, _, speaker in diarization.itertracks(yield_label=True):
                    speakers.add(speaker)
                print(f"   Detected {len(speakers)} speakers: {', '.join(speakers)}")
            except Exception as e:
                print(f"   Standard diarization failed: {str(e)}")
            
            try:
                diarization = self.diarization_pipeline(
                    normalized_file,
                    num_speakers=2,
                    clustering="AgglomerativeClustering"
                )
                speakers = set()
                for _, _, speaker in diarization.itertracks(yield_label=True):
                    speakers.add(speaker)
                print(f"   Detected {len(speakers)} speakers: {', '.join(speakers)}")
            except Exception as e:
                print(f"   Forced parameters failed: {str(e)}")
            
            try:
                result = self.alternative_diarization(normalized_file)
                speakers = set()
                for _, _, speaker in result.itertracks(yield_label=True):
                    speakers.add(speaker)
                print(f"   Detected {len(speakers)} speakers: {', '.join(speakers)}")
            except Exception as e:
                print(f"   Alternative method failed: {str(e)}")
            
            print("\n=== DIAGNOSTICS COMPLETE ===\n")
            
        except Exception as e:
            print(f"Diagnostics failed: {str(e)}")


    def diarization(self, audio_location: str) -> Annotation:
        """Perform speaker diarization on audio file"""
        if not self.diarization_pipeline:
            raise Exception("Diarization pipeline not initialized")
        
        try:
            print("Starting diarization...")
        
            if not isinstance(audio_location, (str, os.PathLike)):
                raise Exception(f"Expected file path, got {type(audio_location)}")
            
            audio_location = str(audio_location)
            
            if not os.path.exists(audio_location):
                raise Exception(f"Audio file not found: {audio_location}")
            
            # Basic diarization
            try:
                diarization = self.diarization_pipeline(audio_location)
                print("Basic diarization completed")
            except Exception as e:
                print(f"Basic diarization failed: {str(e)}")
                # Min params try
                try:
                    diarization = self.diarization_pipeline(
                        audio_location,
                        min_speakers=1,
                        max_speakers=6
                    )
                    print("Diarization with min/max speakers completed")
                except Exception as e2:
                    print(f"Diarization with parameters also failed: {str(e2)}")
                    raise Exception(f"All diarization attempts failed: {str(e2)}")
            
            # Check valid
            valid_segments = []
            speakers = set()
            
            try:
                for segment, track, speaker in diarization.itertracks(yield_label=True):
                    print(f"Segment type: {type(segment)}, Speaker: {speaker}")
                    
                    if hasattr(segment, 'start') and hasattr(segment, 'end'):
                        valid_segments.append((segment, track, speaker))
                        speakers.add(speaker)
                        print(f"Valid segment: {segment.start:.2f}-{segment.end:.2f}, Speaker: {speaker}")
                    elif isinstance(segment, tuple) and len(segment) >= 2:
                        start_time, end_time = segment[0], segment[1]
                        print(f"Tuple segment: {start_time:.2f}-{end_time:.2f}, Speaker: {speaker}")
                        class PseudoSegment:
                            def __init__(self, start, end):
                                self.start = start
                                self.end = end
                        pseudo_segment = PseudoSegment(start_time, end_time)
                        valid_segments.append((pseudo_segment, track, speaker))
                        speakers.add(speaker)
                    else:
                        print(f"Unknown segment format: {type(segment)}, value: {segment}")
            except Exception as e:
                print(f"Error iterating through diarization: {str(e)}")
                raise Exception(f"Failed to process diarization results: {str(e)}")
            
            if not valid_segments:
                raise Exception("No valid segments found in diarization result")
            
            print(f"Found {len(speakers)} speakers: {', '.join(speakers)}")
            
            #If only one spealer
            if len(speakers) <= 1:
                print("Only one speaker detected, trying with forced parameters...")
                try:
                    diarization = self.diarization_pipeline(
                        audio_location,
                        num_speakers=2
                    )
                    print("Forced diarization with num_speakers=2 completed")
                    
                    valid_segments = []
                    speakers = set()
                    
                    for segment, track, speaker in diarization.itertracks(yield_label=True):
                        if hasattr(segment, 'start') and hasattr(segment, 'end'):
                            valid_segments.append((segment, track, speaker))
                            speakers.add(speaker)
                    
                    if len(speakers) <= 1:
                        print("Still only one speaker detected after forced parameters")
                    
                except Exception as e:
                    print(f"Forced diarization failed: {str(e)}")
            
            try:
                diarization = self.post_process_diarization(diarization)
                print("Post-processing completed")
            except Exception as e:
                print(f"Post-processing failed: {str(e)}")
            
            print("\n--- Diarization Segments ---")
            segment_count = 0
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                try:
                    if hasattr(turn, 'start') and hasattr(turn, 'end'):
                        print(f"Speaker: {speaker}, Start: {float(turn.start):.2f}, End: {float(turn.end):.2f}")
                        segment_count += 1
                    elif isinstance(turn, tuple) and len(turn) >= 2:
                        print(f"Speaker: {speaker}, Start: {float(turn[0]):.2f}, End: {float(turn[1]):.2f}")
                        segment_count += 1
                    else:
                        print(f"Unknown turn format: {type(turn)}")
                except Exception as e:
                    print(f"Error displaying segment: {str(e)}")
            
            print(f"Total segments: {segment_count}")
            return diarization
            
        except Exception as e:
            logger.error(f"Diarization error: {str(e)}")
            raise


    def match_transcription_diarization(self, 
                                        diarization: Annotation, 
                                        transcription: Dict[str, Any],
                                        audio_file: str
                                        ) -> Tuple[Dict[str, List[Dict[str, Any]]], str]:
        """Match transcription segments with speaker diarization"""
        try:
            if not diarization:
                print("No diarization available")
                return {}, "No diarization available"
            
            speaker_turns = []
            try:
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    try:
                        if hasattr(turn, 'start') and hasattr(turn, 'end'):
                            speaker_turns.append({
                                'start': float(turn.start),
                                'end': float(turn.end),
                                'speaker': speaker
                            })
                        else:
                            print(f"Invalid turn format: {type(turn)}")
                    except Exception as e:
                        print(f"Error processing turn: {str(e)}")
                        continue
            except Exception as e:
                print(f"Error iterating through diarization: {str(e)}")
                return {}, f"Error processing diarization: {str(e)}"
            
            if not speaker_turns:
                print("No valid speaker turns found")
                return {}, "No valid speaker turns found"
            
            speaker_turns.sort(key=lambda x: x['start'])
            
            unique_speakers_by_time = []
            seen_speakers = set()
            
            for turn in speaker_turns:
                if turn['speaker'] not in seen_speakers:
                    unique_speakers_by_time.append(turn['speaker'])
                    seen_speakers.add(turn['speaker'])
            
            speaker_map = {spkr: f"SPEAKER_{i:02d}" for i, spkr in enumerate(unique_speakers_by_time)}
            
            print(f"Found {len(unique_speakers_by_time)} unique speakers in order of appearance:")
            for old_speaker, new_speaker in speaker_map.items():
                print(f"  {old_speaker} -> {new_speaker}")
            
            speakers = defaultdict(list)
            all_segments = []

            for segment in sorted(transcription['segments'], key=lambda x: x['start']):
                seg_start = segment['start']
                seg_end = segment['end']
                text = segment['text']
                
                overlaps = []
                for turn in speaker_turns:
                    overlap_start = max(seg_start, turn['start'])
                    overlap_end = min(seg_end, turn['end'])
                    if overlap_start < overlap_end: 
                        overlaps.append({
                            'speaker': turn['speaker'],
                            'duration': overlap_end - overlap_start
                        })

                if overlaps:
                    speaker_durations = defaultdict(float)
                    for ov in overlaps:
                        speaker_durations[ov['speaker']] += ov['duration']

                    dominant_speaker = max(speaker_durations.items(), key=lambda x: x[1])[0]
                    norm_speaker = speaker_map[dominant_speaker]            
                    
                    all_segments.append({
                        'start': seg_start,
                        'end': seg_end,
                        'speaker': norm_speaker,
                        'text': text
                    })
                else:
                    closest_speaker = min(speaker_turns, 
                                        key=lambda x: min(abs(x['start'] - seg_start), 
                                                        abs(x['end'] - seg_end)))
                    norm_speaker = speaker_map[closest_speaker['speaker']]
                    
                    all_segments.append({
                        'start': seg_start,
                        'end': seg_end,
                        'speaker': norm_speaker,
                        'text': text
                    })
            
            text_output = ""
            current_speaker = None
            
            for seg in sorted(all_segments, key=lambda x: x['start']):
                if seg['speaker'] != current_speaker:
                    text_output += f"\n=== {seg['speaker']} ===\n"
                    current_speaker = seg['speaker']
                text_output += f"[{seg['start']:.2f}-{seg['end']:.2f}] {seg['text']}\n"
            
            for seg in all_segments:
                speakers[seg['speaker']].append({
                    'start': seg['start'],
                    'end': seg['end'],
                    'text': seg['text']
                })
            
            return dict(speakers), text_output.strip()
        
        except Exception as e:
            print(f"Error in match_transcription_diarization: {str(e)}")
            return {}, f"Error matching transcription with diarization: {str(e)}"