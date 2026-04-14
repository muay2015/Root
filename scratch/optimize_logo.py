from PIL import Image
import os

# 경로 설정
input_path = r'C:\Users\dykim\.gemini\antigravity\brain\5a77a492-7a25-442a-bf07-56996101c706\media__1776155493401.png'
output_path = r'c:\Users\dykim\OneDrive\바탕 화면\문서저장소\작업\ROOT\public\logo_ai.png'

def optimize_logo(input_path, output_path, size=(256, 256)):
    try:
        if not os.path.exists(input_path):
            print(f"Error: Input file not found at {input_path}")
            return

        # 이미지 열기
        img = Image.open(input_path)
        
        # RGBA 환경 유지 (투명도)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
            
        # 리사이징 (LANCZOS 필터 사용으로 품질 최적화)
        # Pillow 버전에 따라 Image.Resampling.LANCZOS 또는 Image.LANCZOS 사용
        try:
            resampling_filter = Image.Resampling.LANCZOS
        except AttributeError:
            resampling_filter = Image.LANCZOS
            
        img_resized = img.resize(size, resampling_filter)
        
        # 저장 (최적화 및 압축)
        img_resized.save(output_path, 'PNG', optimize=True)
        print(f"Success: Optimized logo saved to {output_path}")
        print(f"Original size: {os.path.getsize(input_path) // 1024}KB")
        print(f"Optimized size: {os.path.getsize(output_path) // 1024}KB")
        
    except Exception as e:
        print(f"Error during optimization: {e}")

if __name__ == "__main__":
    optimize_logo(input_path, output_path)
