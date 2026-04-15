import json
import frontmatter
from pathlib import Path
from datetime import date

def update_posts_json():
    # Lấy đường dẫn của chính file script đang chạy
    current_dir = Path(__file__).parent.absolute()
    
    # Xác định đường dẫn thư mục content và file posts.json (nằm cùng thư mục script)
    content_dir = current_dir / "content"
    output_file = current_dir / "content/posts.json"
    
    posts = []
    
    # Kiểm tra thư mục content
    if not content_dir.exists():
        print(f"❌ Không tìm thấy thư mục: {content_dir}")
        return

    # Duyệt qua các file .mdx bằng pathlib (rất an toàn)
    for mdx_file in content_dir.rglob("*.mdx"):
        try:
            # Đọc nội dung file
            with open(mdx_file, 'r', encoding='utf-8') as f:
                post_data = frontmatter.load(f)
                
                # Tính toán path tương đối (ví dụ: ai-eng/llm-vi.mdx)
                # .as_posix() để đảm bảo dùng dấu "/" thay vì "\" của Windows
                relative_path = mdx_file.relative_to(content_dir).as_posix()
                
                # ID là tên file không có đuôi
                post_id = mdx_file.stem
                
                # Xử lý ngày tháng
                raw_date = post_data.get('date', '1970-01-01')
                if isinstance(raw_date, (date,)):
                    formatted_date = raw_date.isoformat()
                else:
                    formatted_date = str(raw_date)

                post_info = {
                    "id": post_id,
                    "title": post_data.get('title', 'Untitled'),
                    "date": formatted_date,
                    "author": post_data.get('author', 'Anonymous'),
                    "category": post_data.get('category', 'uncategorized'),
                    "lang": post_data.get('lang', 'vi'),
                    "tags": post_data.get('tags', []),
                    "excerpt": post_data.get('excerpt', ''),
                    "path": relative_path
                }
                
                if 'pinned' in post_data:
                    post_info['pinned'] = post_data['pinned']
                    
                posts.append(post_info)
        except Exception as e:
            print(f"⚠️ Lỗi tại file {mdx_file.name}: {e}")

    # Sắp xếp theo ngày giảm dần
    posts.sort(key=lambda x: (x['date'], x['id']), reverse=True)

    # Ghi file JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Thành công! Đã cập nhật {len(posts)} bài viết vào: {output_file}")

if __name__ == "__main__":
    update_posts_json()