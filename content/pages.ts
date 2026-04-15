import { Language, SITE_CONFIG } from '../config';
import { parseFrontmatter } from './posts';

// Dynamically discover all MDX files in the pages directory
const pageFiles = import.meta.glob('./pages/*.mdx', { query: 'raw', eager: true }) as Record<string, { default: string }>;

export const getPageContent = async (type: 'about' | 'contact' | 'roadmap' | 'resources', lang: Language): Promise<string> => {
  const fileName = `./pages/${type}-${lang}.mdx`;

  if (SITE_CONFIG.contentCdnUrl) {
    try {
      // Clean up path: ./pages/about-vi.mdx -> pages/about-vi.mdx
      const relativePath = fileName.replace(/^\.\//, '');
      const response = await fetch(`${SITE_CONFIG.contentCdnUrl}/${relativePath}`);
      if (response.ok) {
        const rawContent = await response.text();
        const { content } = parseFrontmatter(rawContent);
        return content;
      }
    } catch (error) {
      console.error('Error fetching page from CDN:', error);
    }
  }

  const module = pageFiles[fileName];
  
  if (!module) {
    // Fallback to default language if requested language not found
    const fallbackFileName = `./pages/${type}-vi.mdx`;
    const fallbackModule = pageFiles[fallbackFileName];
    if (!fallbackModule) return '';
    const { content } = parseFrontmatter(fallbackModule.default);
    return content;
  }
  
  const { content } = parseFrontmatter(module.default);
  return content;
};
