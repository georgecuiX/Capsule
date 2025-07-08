import whisper
import os

print(f"Current working directory: {os.getcwd()}")

# Load model
model = whisper.load_model("base")

# Test with the audio file that was created
audio_path = "temp_audio/temp_audio.wav"

if os.path.exists(audio_path):
    print(f"Testing Whisper with: {audio_path}")
    print(f"Absolute path: {os.path.abspath(audio_path)}")
    print(f"File size: {os.path.getsize(audio_path)} bytes")
    
    try:
        result = model.transcribe(os.path.abspath(audio_path))
        print("SUCCESS!")
        print(f"Text: {result['text'][:200]}...")  # First 200 chars
    except Exception as e:
        print(f"FAILED: {e}")
else:
    print(f"Audio file not found: {audio_path}")
    print(f"Absolute path would be: {os.path.abspath(audio_path)}")
    
    # List files in temp_audio directory
    if os.path.exists("temp_audio"):
        files = os.listdir("temp_audio")
        print(f"Files in temp_audio: {files}")
    else:
        print("temp_audio directory doesn't exist")
        
    # Also check if there's a temp_audio_simple.wav file
    if os.path.exists("temp_audio_simple.wav"):
        print("Found temp_audio_simple.wav")
        try:
            result = model.transcribe("temp_audio_simple.wav")
            print("SUCCESS with simple file!")
            print(f"Text: {result['text'][:200]}...")
        except Exception as e:
            print(f"FAILED with simple file: {e}")