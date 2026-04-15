import { Language, SITE_CONFIG } from '../config';

export interface PostMetadata {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  lang: Language;
  date: string;
  author: string;
  authorAvatar?: string;
  tags: string[];
  path: string;
  draft?: boolean;
  pinned?: boolean;
}

export interface Post extends PostMetadata {
  content: string;
}

// Simple lightweight frontmatter parser to avoid Node.js 'Buffer' dependencies
export function parseFrontmatter(rawContent: string) {
  const regex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = rawContent.match(regex);
  
  if (!match) return { data: {} as any, content: rawContent };
  
  const yamlBlock = match[1];
  const content = match[2];
  const data: Record<string, any> = {};
  
  yamlBlock.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > -1) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      
      // Basic YAML-like parsing for strings, arrays, booleans and dates
      if (value.startsWith('[') && value.endsWith(']')) {
        data[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      } else if (value === 'true') {
        data[key] = true;
      } else if (value === 'false') {
        data[key] = false;
      } else {
        data[key] = value.replace(/^['"]|['"]$/g, '');
      }
    }
  });
  
  return { data, content };
}

// Dynamically discover all MDX files
const mdxFiles = import.meta.glob('./**/*.mdx', { query: 'raw', eager: true }) as Record<string, { default: string }>;

export const POSTS_METADATA: PostMetadata[] = Object.entries(mdxFiles).map(([path, module]) => {
  const rawContent = module.default;
  const { data } = parseFrontmatter(rawContent);
  
  const id = path.split('/').pop()?.replace('.mdx', '') || Math.random().toString(36).substring(7);

  return {
    id,
    title: data.title || 'Untitled',
    excerpt: data.excerpt || '',
    category: data.category || 'uncategorized',
    lang: (data.lang as Language) || 'vi',
    date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    author: data.author || 'Anonymous',
    authorAvatar: data.authorAvatar,
    tags: data.tags || [],
    path: path,
    draft: data.draft === true,
    pinned: data.pinned === true
  };
}).filter(post => !post.path.includes('/pages/') && !post.draft)
  .sort((a, b) => {
    // Pinned posts first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    // Then by date
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

// Function to get full post content lazily
export const getPostContent = async (id: string): Promise<string> => {
  const metadata = POSTS_METADATA.find(p => p.id === id);
  if (!metadata) return '';

  if (SITE_CONFIG.contentCdnUrl) {
    try {
      // Clean up path: ./ai-eng/llm-vi.mdx -> ai-eng/llm-vi.mdx
      const relativePath = metadata.path.replace(/^\.\//, '');
      const response = await fetch(`${SITE_CONFIG.contentCdnUrl}/${relativePath}`);
      if (response.ok) {
        const rawContent = await response.text();
        const { content } = parseFrontmatter(rawContent);
        return content;
      }
    } catch (error) {
      console.error('Error fetching post from CDN:', error);
    }
  }

  const module = mdxFiles[metadata.path];
  if (!module) return '';
  const { content } = parseFrontmatter(module.default);
  return content;
};

export const ALL_TAGS = Array.from(new Set(POSTS_METADATA.flatMap(post => post.tags))).sort();
