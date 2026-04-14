from PIL import Image
import os

# 경로 설정
root_dir = r'c:\Users\dykim\OneDrive\바탕 화면\문서저장소\작업\ROOT'
logo_path = os.path.join(root_dir, 'public', 'logo.png')
og_output_path = os.path.join(root_dir, 'public', 'og-image.png')

def pad_image(input_path, output_path, padding_ratio=1.6):
    try:
        # 로고 불러오기
        logo = Image.open(input_path)
        
        # 투명도가 있으면 흰색 배경으로 합성
        if logo.mode in ('RGBA', 'LA'):
            background = Image.new('RGB', logo.size, (255, 255, 255))
            background.paste(logo, mask=logo.split()[-1])
            logo = background
        else:
            logo = logo.convert('RGB')

        logo_w, logo_h = logo.size
        
        # 여백이 포함된 캔버스 크기 결정 (정사각형이 SNS 공유 시 가장 안전함)
        canvas_size = int(max(logo_w, logo_h) * padding_ratio)
        canvas = Image.new('RGB', (canvas_size, canvas_size), (255, 255, 255))
        
        # 중앙 배치
        offset = ((canvas_size - logo_w) // 2, (canvas_size - logo_h) // 2)
        canvas.paste(logo, offset)
        
        # 저장
        canvas.save(output_path, 'PNG', quality=95)
        print(f"Success: {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # 1. SNS 공유용 (충분한 여백과 정사각형 캔버스)
    pad_image(logo_path, og_output_path, padding_ratio=1.6)
    
    # 2. 애플 홈 화면 아이콘용 (적당한 여백)
    apple_icon_path = os.path.join(root_dir, 'public', 'apple-touch-icon.png')
    pad_image(logo_path, apple_icon_path, padding_ratio=1.2)
