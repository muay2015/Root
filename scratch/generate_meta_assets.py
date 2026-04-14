from PIL import Image
import os

# 경로 설정
root_dir = r'c:\Users\dykim\OneDrive\바탕 화면\문서저장소\작업\ROOT'
logo_ai_path = os.path.join(root_dir, 'public', 'logo_ai.png')

def pad_and_save(input_path, output_path, canvas_size, padding_ratio=1.6):
    try:
        # 로고 불러오기
        logo = Image.open(input_path)
        
        # 투명 배경인 경우 흰색 배경으로 합성 (SNS/아이콘용으로 더 안전함)
        if logo.mode in ('RGBA', 'LA'):
            background = Image.new('RGB', logo.size, (255, 255, 255))
            background.paste(logo, mask=logo.split()[-1])
            logo = background
        else:
            logo = logo.convert('RGB')

        logo_w, logo_h = logo.size
        
        # 여백 포함 캔버스 크기 결정
        current_canvas = int(max(logo_w, logo_h) * padding_ratio)
        temp_canvas = Image.new('RGB', (current_canvas, current_canvas), (255, 255, 255))
        
        # 중앙 배치
        offset = ((current_canvas - logo_w) // 2, (current_canvas - logo_h) // 2)
        temp_canvas.paste(logo, offset)
        
        # 최종 사이즈로 리사이징
        final_img = temp_canvas.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)
        
        # 저장
        final_img.save(output_path, 'PNG', optimize=True)
        print(f"Success: {output_path} ({canvas_size}x{canvas_size})")
        
    except Exception as e:
        print(f"Error for {output_path}: {e}")

if __name__ == "__main__":
    # 1. Favicon용 (128x128, 적은 여백)
    pad_and_save(logo_ai_path, os.path.join(root_dir, 'public', 'logo.png'), 128, padding_ratio=1.1)
    
    # 2. 애플 홈 화면 아이콘용 (180x180, 중간 여백)
    pad_and_save(logo_ai_path, os.path.join(root_dir, 'public', 'apple-touch-icon.png'), 180, padding_ratio=1.2)
    
    # 3. SNS 공유용 (1200x1200px, 충분한 여백)
    pad_and_save(logo_ai_path, os.path.join(root_dir, 'public', 'og-image.png'), 1200, padding_ratio=1.6)
