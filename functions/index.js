// /functions/index.js
import { getHost, loadSitesRegistry, getSiteConfig, KV_KEYS } from './_lib.js';

/** SSR "/" — builds the full HTML page from KV snapshot with testimonials list */
export const onRequestGet = async ({ request, env }) => {
  const host = new URL(request.url).host.toLowerCase();
  let sites, site, keys;

  // Load site config
  try {
    sites = await loadSitesRegistry();
    site  = getSiteConfig(sites, host);
    keys  = KV_KEYS(host);
  } catch (err) {
    return html(500, `<!doctype html><h1>Config error</h1><pre>${escapeHtml(String(err))}</pre>`);
  }

  // Load snapshot
  const [raw, updatedAt] = await Promise.all([
    env.TESTIMONIALS_KV.get(keys.data),
    env.TESTIMONIALS_KV.get(keys.updated),
  ]);
  if (!raw) {
    return html(503, `<!doctype html><h1>No data yet</h1><p>Try refreshing the site data.</p>`);
  }
  const allTestimonials = JSON.parse(raw);

  // Filter testimonials where Show/Hide = "Show"
  const visibleTestimonials = allTestimonials.filter(t => 
    (t['Show/Hide'] || t.show_hide || '').toString().trim().toLowerCase() === 'show'
  );

  // Sort by date (newest first)
  visibleTestimonials.sort((a, b) => {
    const dateA = parseDate(a.date || a.Date || '');
    const dateB = parseDate(b.date || b.Date || '');
    return dateB - dateA; // newest first
  });

  const { seo, page_title, return_url } = site;

  // Build JSON-LD schema
  const pageUrl = `https://${host}/`;
  const pageName = seo?.title || 'Testimonials';
  const pageDesc = seo?.description || '';

  const itemListElements = visibleTestimonials
    .map((testimonial, idx) => {
      const text = testimonial.testimonial || testimonial.Testimonial || '';
      const name = testimonial.name || testimonial.Name || '';
      if (!text || !name) return null;

      return {
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Review',
          '@id': `#testimonial-${idx}`,
          reviewBody: text,
          author: {
            '@type': 'Person',
            name: name
          },
          datePublished: testimonial.date || testimonial.Date || ''
        }
      };
    })
    .filter(Boolean);

  const schemaObject = {
    '@context': 'https://schema.org',
    '@type': ['WebPage', 'CollectionPage'],
    name: pageName,
    url: pageUrl,
    description: pageDesc,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: itemListElements
    }
  };

  // Safe JSON for embedding in <script>
  const schemaJson = JSON.stringify(schemaObject).replace(/</g, '\\u003c');

  // Build testimonials list HTML
  const testimonialsList = visibleTestimonials.length > 0
    ? visibleTestimonials.map((t, idx) => {
        const text = t.testimonial || t.Testimonial || '';
        const name = t.name || t.Name || '';
        const date = formatDate(t.date || t.Date || '');
        
        return `
          <div class="testimonial-item" data-testimonial="${idx}">
            <p class="testimonial-text">${escapeHtml(text)}</p>
            <p class="testimonial-author">— ${escapeHtml(name)}</p>
            ${date ? `<p class="testimonial-date">${escapeHtml(date)}</p>` : ''}
          </div>
        `;
      }).join('')
    : '<p class="no-testimonials">No testimonials available at this time.</p>';

  // HTML shell
  return html(200, /* html */`<!doctype html>
<html lang="en">
  <head>
  <link rel="icon" type="image/png" href="https://www.mineralrightsforum.com/uploads/db5755/optimized/2X/5/53c419e5d847ede71cf80a938cf0156350637c44_2_32x32.png">
  <link rel="stylesheet" href="/styles.css?v=202511080417p">
  <meta charset="utf-8">
  <title>${escapeHtml(seo?.title || 'Testimonials')}</title>
  <meta property="og:title" content="${escapeHtml(seo?.title || 'Testimonials')}">
  <meta property="og:description" content="${escapeHtml(seo?.description || '')}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="https://www.mineralrightsforum.com/uploads/db5755/original/3X/7/7/7710a47c9cd8492b1935dd3b8d80584938456dd4.jpeg">
  <meta property="og:site_name" content="Mineral Rights Forum">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="description" content="${escapeHtml(seo?.description || '')}">
  <meta name="robots" content="index, follow">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://static.mineralrightsforum.com/styles.css">
  <!-- Google Analytics 4 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZS0JTM2XTR"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-ZS0JTM2XTR');
  </script>
  <script type="application/ld+json">
  ${schemaJson}
  </script>
  <style>
    :root{
      --mrf-primary: #111827;       /* gray-900 */
      --mrf-primary-700: #0f172a;   /* slate-900-ish */
      --mrf-text-on-primary: #ffffff;
      --mrf-outline: #e5e7eb;       /* gray-200 */
      --mrf-border: #e5e7eb;       /* gray-200 */
      --mrf-subtle: #6b7280;       /* gray-500 */
      --mrf-accent: #f59e0b;        /* amber-500 */
      --mrf-accent-600: #d97706;    /* amber-600 */
    }
    html{ scroll-behavior:smooth; }
    body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;color:#111;line-height:1.5}
    .container{max-width:1280px;margin:0 auto;padding:1rem}
    
    /* Header Back Button */
    .header-back-btn{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      font-size: 0.9375rem;
      font-weight: 500;
      color: #ffffff;
      background: #23456D;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .header-back-btn:hover{
      background: #1a3454;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(35, 69, 109, 0.2);
    }
    .header-back-btn:active{
      transform: translateY(0);
      box-shadow: none;
    }
    .header-back-btn svg{
      flex-shrink: 0;
    }

    /* Top Navbar (non-sticky) */
    .top-navbar{
      background: #ffffff;
      border-bottom: 1px solid var(--mrf-border);
      padding: 0;
    }
    .top-navbar .container{
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
    }
    .top-navbar a{
      color: var(--mrf-primary);
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      transition: all 0.2s ease;
    }
    .top-navbar a:hover{
      background: #f3f4f6;
      color: var(--mrf-primary-700);
    }
    .top-navbar .search-box{
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--mrf-border);
      border-radius: 0.375rem;
      background: #ffffff;
      color: var(--mrf-subtle);
      font-size: 0.9375rem;
      cursor: not-allowed;
    }

    /* Testimonials List Styles */
    .testimonials-container{
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    .testimonial-item{
      margin-bottom: 2.5rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--mrf-border);
    }
    .testimonial-item:last-child{
      border-bottom: none;
      margin-bottom: 0;
    }
    .testimonial-text{
      font-size: 1.125rem;
      line-height: 1.7;
      color: #374151;
      margin: 0 0 1rem 0;
      font-style: italic;
    }
    .testimonial-author{
      font-size: 1rem;
      font-weight: 600;
      color: var(--mrf-primary);
      margin: 0 0 0.25rem 0;
    }
    .testimonial-date{
      font-size: 0.875rem;
      color: var(--mrf-subtle);
      margin: 0;
    }
    .no-testimonials{
      text-align: center;
      color: var(--mrf-subtle);
      font-size: 1.125rem;
      padding: 3rem 1rem;
    }

    /* Footer Styles */
    footer{
      background: var(--mrf-primary);
      color: #f9fafb;
      padding: 2.5rem 0;
      margin-top: 3rem;
      width: 100%;
    }
    .footer-content{
      max-width: 100%;
      padding: 0 2rem;
      display: flex;
      flex-wrap: wrap;
      gap: 2rem;
      justify-content: space-between;
      align-items: flex-start;
    }
    .footer-left{
      flex: 0 0 auto;
      text-align: left;
    }
    .footer-left h3{
      font-size: 1.125rem;
      font-weight: 700;
      color: #f9fafb;
      margin: 0 0 0.5rem 0;
    }
    .footer-left p{
      font-size: 0.875rem;
      color: #d1d5db;
      margin: 0;
      line-height: 1.5;
    }
    .footer-right{
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      align-items: flex-end;
      text-align: right;
    }
    .footer-menu{
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
      justify-content: flex-end;
    }
    .footer-menu a{
      color: #e5e7eb;
      text-decoration: none;
      font-size: 0.9375rem;
      transition: color 0.2s ease;
    }
    .footer-menu a:hover{
      color: #ffffff;
    }
    .footer-social{
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    .footer-social a{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 0.375rem;
      background: rgba(255, 255, 255, 0.1);
      color: #e5e7eb;
      transition: all 0.2s ease;
    }
    .footer-social a:hover{
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
    .footer-social svg{
      width: 20px;
      height: 20px;
    }
    @media (max-width: 767px){
      footer{
        padding: 2rem 0;
      }
      .footer-content{
        flex-direction: column;
        gap: 1.5rem;
        padding: 0 1.5rem;
      }
      .footer-left{
        text-align: left;
      }
      .footer-right{
        align-items: flex-start;
        text-align: left;
      }
      .footer-menu{
        flex-direction: column;
        gap: 1rem;
        justify-content: flex-start;
      }
      .top-navbar .container{
        flex-direction: column;
        gap: 0.5rem;
      }
      .testimonials-container{
        margin: 1.5rem auto;
        padding: 0 1rem;
      }
      .testimonial-item{
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
      }
      .testimonial-text{
        font-size: 1rem;
      }
    }
  </style>
</head>
<body class="bg-white">

  <!-- ===== MRF HEADER ===== -->
  <header class="z-10 bg-white shadow-xl">
    <div class="bg-white max-w-7xl mx-auto px-4 sm:px-6 py-3 border-b border-gray-200">
      <div class="flex items-center justify-center md:justify-between">
        <a href="https://www.mineralrightsforum.com" class="block w-fit">
          <img src="https://www.mineralrightsforum.com/uploads/db5755/original/3X/7/7/7710a47c9cd8492b1935dd3b8d80584938456dd4.jpeg"
               alt="Mineral Rights Forum Logo"
               class="h-12 w-auto rounded-lg"
               onerror="this.onerror=null;this.src='https://placehold.co/150x40/d1d5db/4b5563?text=MRF+Logo'">
        </a>
        <button class="header-back-btn" style="display: none;" id="returnBtn" data-return-url="${return_url ? escapeAttr(return_url) : 'https://www.mineralrightsforum.com'}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back to Forum</span>
        </button>
      </div>
    </div>
  </header>

  <!-- ===== TOP NAVBAR (non-sticky) ===== -->
  <nav class="top-navbar">
    <div class="container">
      <a href="https://www.mineralrightsforum.com">Home</a>
      <a href="https://www.mineralrightsforum.com/latest">Latest Posts</a>
      <a href="https://www.mineralrightsforum.com/categories">Categories</a>
      <a href="https://www.mineralrightsforum.com/advertise">Advertise with Us</a>
      <div class="search-box">Search</div>
    </div>
  </nav>

  <!-- ===== CONTENT ===== -->
  <main class="testimonials-container">
    <h1 style="font-size: 2rem; font-weight: 700; margin: 2rem 0 1.5rem 0; color: var(--mrf-primary); text-align: center;">
      ${escapeHtml(page_title || 'Testimonials')}
    </h1>
    ${testimonialsList}
  </main>

  <footer>
    <div class="footer-content">
      <div class="footer-left">
        <h3>The Mineral Rights Forum</h3>
        <p>&copy; ${new Date().getFullYear()} The Mineral Rights Forum, All Rights Reserved</p>
      </div>
      <div class="footer-right">
        <ul class="footer-menu">
          <li><a href="https://www.mineralrightsforum.com">Home</a></li>
          <li><a href="https://www.mineralrightsforum.com/about">About</a></li>
          <li><a href="https://www.mineralrightsforum.com/privacy">Privacy</a></li>
          <li><a href="https://www.mineralrightsforum.com/tos">TOS</a></li>
          <li><a href="https://www.mineralrightsforum.com/advertise">Advertise</a></li>
          <li><a href="https://www.mineralrightsforum.com/testimonials">Testimonials</a></li>
        </ul>
        <div class="footer-social">
          <a href="#" aria-label="Facebook">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1h3z"></path>
            </svg>
          </a>
          <a href="#" aria-label="X (Twitter)">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
            </svg>
          </a>
          <a href="#" aria-label="LinkedIn">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
              <rect x="2" y="9" width="4" height="12"></rect>
              <circle cx="4" cy="4" r="2"></circle>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </footer>

  <script>
  document.addEventListener('DOMContentLoaded', () => {
    // Show/hide return button based on screen size
    const returnBtn = document.getElementById('returnBtn');
    function toggleReturnButton() {
      if (returnBtn) {
        if (window.matchMedia('(min-width: 768px)').matches) {
          returnBtn.style.display = 'inline-flex';
        } else {
          returnBtn.style.display = 'none';
        }
      }
    }
    toggleReturnButton();
    window.addEventListener('resize', toggleReturnButton);
    
    // Handle return button click - navigate to return_url from site config
    if (returnBtn) {
      const returnUrl = returnBtn.getAttribute('data-return-url') || 'https://www.mineralrightsforum.com';
      returnBtn.addEventListener('click', () => {
        window.location.href = returnUrl;
      });
    }
  });
  </script>

</body>
</html>
`);

  // -------- helpers --------
  function parseDate(dateStr) {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; // Return original if invalid
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
  function escapeAttr(s){ return escapeHtml(s).replace(/"/g,'&quot;'); }
};

function html(status, body){ return new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } }); }

