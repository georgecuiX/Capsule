from moviepy.video.io.VideoFileClip import VideoFileClip
import os
from pathlib import Path

# Test audio extraction directly
video_path = "uploads/7d6b63a2-c63b-4d29-b048-38a9e2db5718.MP4"

if not os.path.exists(video_path):
    print(f"Video file not found: {video_path}")
    exit()

print(f"Testing audio extraction from: {video_path}")

try:
    # Load video
    print("Loading video...")
    video = VideoFileClip(video_path)
    print(f"Video loaded. Duration: {video.duration} seconds")
    
    # Check if video has audio
    if video.audio is None:
        print("ERROR: Video has no audio track!")
        exit()
    
    print(f"Audio found. Duration: {video.audio.duration} seconds")
    
    # Create output path
    output_path = "test_audio_output.wav"
    
    # Remove existing file
    if os.path.exists(output_path):
        os.remove(output_path)
    
    print(f"Extracting audio to: {output_path}")
    
    # Extract audio with verbose output
    video.audio.write_audiofile(
        output_path,
        verbose=True,
        logger='bar'
    )
    
    # Check if file was created
    if os.path.exists(output_path):
        size = os.path.getsize(output_path)
        print(f"SUCCESS! Audio file created: {output_path}")
        print(f"File size: {size} bytes")
    else:
        print("ERROR: Audio file was not created")
    
    # Clean up
    video.audio.close()
    video.close()
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()