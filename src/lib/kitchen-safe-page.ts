// ============================================================================
// LANDING PAGE SEGURA (SAFE PAGE / WHITE PAGE) — COZINHA & CULINÁRIA
// Exibida exclusivamente para Bots de Plataformas (Meta, Google, TikTok, etc.)
// e Verificadores/Datacenters de Hosts (AWS, Hetzner, DO, etc.)
// ============================================================================

export function renderKitchenSafePage(): string {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cozinha & Sabor — Dicas, Utensílios e Receitas Práticas</title>
  <meta name="description" content="Descubra as melhores dicas para equipar sua cozinha com praticidade, receitas deliciosas do dia a dia e guias de organização culinária." />
  <meta name="robots" content="index, follow" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #ea580c;
      --primary-hover: #c2410c;
      --primary-light: #ffedd5;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-700: #334155;
      --slate-600: #475569;
      --slate-200: #e2e8f0;
      --slate-100: #f1f5f9;
      --slate-50: #f8fafc;
      --white: #ffffff;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--slate-50);
      color: var(--slate-800);
      line-height: 1.6;
    }
    header {
      background: var(--white);
      border-bottom: 1px solid var(--slate-200);
      position: sticky;
      top: 0;
      z-index: 40;
    }
    .nav-container {
      max-width: 1120px;
      margin: 0 auto;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      text-decoration: none;
      color: var(--slate-900);
      font-weight: 700;
      font-size: 1.25rem;
    }
    .brand-icon {
      background: var(--primary);
      color: var(--white);
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
    }
    .nav-links {
      display: flex;
      gap: 1.5rem;
      list-style: none;
    }
    .nav-links a {
      text-decoration: none;
      color: var(--slate-600);
      font-weight: 500;
      font-size: 0.95rem;
      transition: color 0.2s;
    }
    .nav-links a:hover {
      color: var(--primary);
    }
    .hero {
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
      padding: 4.5rem 1.5rem;
      text-align: center;
      border-bottom: 1px solid #fed7aa;
    }
    .hero-container {
      max-width: 820px;
      margin: 0 auto;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--white);
      color: var(--primary);
      padding: 0.35rem 0.9rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: var(--shadow-sm);
      margin-bottom: 1.25rem;
      border: 1px solid #ffedd5;
    }
    .hero h1 {
      font-size: 2.5rem;
      font-weight: 800;
      color: var(--slate-900);
      line-height: 1.2;
      margin-bottom: 1.2rem;
      letter-spacing: -0.025em;
    }
    .hero p {
      font-size: 1.15rem;
      color: var(--slate-600);
      margin-bottom: 2rem;
      max-width: 650px;
      margin-left: auto;
      margin-right: auto;
    }
    .cta-btn {
      display: inline-block;
      background: var(--primary);
      color: var(--white);
      font-weight: 600;
      padding: 0.85rem 1.8rem;
      border-radius: 8px;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);
      transition: background 0.2s, transform 0.1s;
    }
    .cta-btn:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }
    .container {
      max-width: 1120px;
      margin: 0 auto;
      padding: 4rem 1.5rem;
    }
    .section-header {
      text-align: center;
      margin-bottom: 3rem;
    }
    .section-header h2 {
      font-size: 1.85rem;
      font-weight: 700;
      color: var(--slate-900);
      margin-bottom: 0.5rem;
    }
    .section-header p {
      color: var(--slate-600);
      font-size: 1rem;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }
    .card {
      background: var(--white);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--slate-200);
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
    }
    .card-body {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }
    .card-icon {
      font-size: 2rem;
      margin-bottom: 1rem;
      display: inline-block;
    }
    .card h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--slate-900);
      margin-bottom: 0.75rem;
    }
    .card p {
      font-size: 0.95rem;
      color: var(--slate-600);
      margin-bottom: 1.25rem;
      line-height: 1.5;
    }
    .features-list {
      list-style: none;
      margin-top: auto;
      border-top: 1px solid var(--slate-100);
      padding-top: 1rem;
    }
    .features-list li {
      font-size: 0.875rem;
      color: var(--slate-700);
      margin-bottom: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .features-list li::before {
      content: "✓";
      color: #16a34a;
      font-weight: bold;
    }
    .article-section {
      background: var(--white);
      border-top: 1px solid var(--slate-200);
      border-bottom: 1px solid var(--slate-200);
      padding: 4rem 1.5rem;
    }
    .article-box {
      max-width: 800px;
      margin: 0 auto;
    }
    .article-box h2 {
      font-size: 1.75rem;
      color: var(--slate-900);
      margin-bottom: 1.25rem;
    }
    .article-box p {
      color: var(--slate-700);
      margin-bottom: 1.25rem;
      font-size: 1.05rem;
    }
    .tips-box {
      background: #f8fafc;
      border-left: 4px solid var(--primary);
      padding: 1.25rem 1.5rem;
      border-radius: 0 8px 8px 0;
      margin: 1.5rem 0;
    }
    .tips-box h4 {
      color: var(--slate-900);
      font-size: 1.05rem;
      margin-bottom: 0.5rem;
    }
    .tips-box ul {
      padding-left: 1.2rem;
      color: var(--slate-600);
      font-size: 0.95rem;
    }
    .tips-box li {
      margin-bottom: 0.35rem;
    }
    footer {
      background: var(--slate-900);
      color: var(--slate-400);
      padding: 3rem 1.5rem;
      font-size: 0.875rem;
      text-align: center;
    }
    .footer-container {
      max-width: 1120px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
    }
    .footer-links {
      display: flex;
      gap: 1.5rem;
    }
    .footer-links a {
      color: var(--slate-400);
      text-decoration: none;
      transition: color 0.2s;
    }
    .footer-links a:hover {
      color: var(--white);
    }
    @media (max-width: 768px) {
      .hero h1 { font-size: 2rem; }
      .nav-links { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <div class="nav-container">
      <a href="/" class="brand">
        <span class="brand-icon">🍳</span>
        <span>Cozinha &amp; Sabor</span>
      </a>
      <ul class="nav-links">
        <li><a href="#utensilios">Utensílios Essenciais</a></li>
        <li><a href="#organizacao">Organização</a></li>
        <li><a href="#receitas">Receitas Rápidas</a></li>
        <li><a href="#contato">Contato</a></li>
      </ul>
    </div>
  </header>

  <section class="hero">
    <div class="hero-container">
      <div class="badge">
        <span>✨</span> Guia Completo do Espaço Culinário
      </div>
      <h1>A Cozinha Prática e Moderna que Transforma sua Rotina</h1>
      <p>Aprenda a escolher os melhores utensílios, manter sua bancada sempre funcional e preparar receitas rápidas sem complicação no seu dia a dia.</p>
      <a href="#utensilios" class="cta-btn">Conferir Dicas &amp; Equipamentos</a>
    </div>
  </section>

  <main class="container">
    <div class="section-header">
      <h2>Destaques para sua Cozinha</h2>
      <p>Soluções testadas e recomendadas para cozinhar melhor com menos esforço</p>
    </div>

    <div class="grid" id="utensilios">
      <div class="card">
        <div class="card-body">
          <div class="card-icon">🔪</div>
          <h3>Facas e Tábuas Culinárias</h3>
          <p>O corte perfeito faz toda a diferença no tempo de preparo. Conheça as lâminas em aço inoxidável e as tábuas antibacterianas mais indicadas.</p>
          <ul class="features-list">
            <li>Aço inox de alta retenção de fio</li>
            <li>Cabos ergonômicos e antiderrapantes</li>
            <li>Higienização prática e segura</li>
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="card-icon">🥘</div>
          <h3>Panelas e Frigideiras Antiaderentes</h3>
          <p>Cozinhe alimentos com menos gordura e evite que grudem. Estruturas cerâmicas e livres de metais pesados para refeições mais saudáveis.</p>
          <ul class="features-list">
            <li>Revestimento livre de PFOA e PTFE</li>
            <li>Distribuição uniforme de calor</li>
            <li>Compatibilidade com indução e gás</li>
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="card-icon">🥣</div>
          <h3>Organização e Potes Herméticos</h3>
          <p>Preserve o frescor de grãos, temperos e sobras de refeições por mais tempo com recipientes de vedação total e visual limpo.</p>
          <ul class="features-list">
            <li>Travas laterais com anel de silicone</li>
            <li>Vidro borossilicato resistente a choque térmico</li>
            <li>Otimização de armários e gavetas</li>
          </ul>
        </div>
      </div>
    </div>
  </main>

  <section class="article-section" id="organizacao">
    <div class="article-box">
      <h2>3 Regras de Ouro para uma Cozinha Funcional</h2>
      <p>Manter uma rotina agradável na cozinha depende muito mais de organização espacial do que de dezenas de aparelhos caros. Pequenas mudanças de hábito tornam o ato de cozinhar mais rápido, limpo e terapêutico.</p>

      <div class="tips-box">
        <h4>💡 Guia Rápido de Otimização:</h4>
        <ul>
          <li><strong>Mise en place antes do fogo:</strong> Separe e corte todos os ingredientes antes de ligar a chama para não queimar nada.</li>
          <li><strong>Bancada de apoio desimpedida:</strong> Deixe livre o espaço entre a pia e o fogão; este é o coração operacional da cozinha.</li>
          <li><strong>Lave enquanto espera:</strong> Aproveite o tempo em que o prato ferve ou assa para lavar as tábuas e tigelas já usadas.</li>
        </ul>
      </div>

      <p>Quer saber mais sobre técnicas culinárias ou tirar dúvidas sobre manutenção de utensílios? Acompanhe nossos artigos periódicos e dicas de conservação.</p>
    </div>
  </section>

  <footer id="contato">
    <div class="footer-container">
      <div class="footer-links">
        <a href="#utensilios">Utensílios</a>
        <a href="#organizacao">Organização</a>
        <a href="#receitas">Receitas</a>
        <a href="#privacidade">Política de Privacidade</a>
        <a href="#termos">Termos de Uso</a>
      </div>
      <p>© ${currentYear} Cozinha &amp; Sabor Blog &amp; Conteúdo Institucional. Todos os direitos reservados.</p>
      <p style="font-size: 0.75rem; color: #64748b;">Conteúdo informativo sobre gastronomia doméstica, conservação de alimentos e design de cozinhas.</p>
    </div>
  </footer>
</body>
</html>`;
}
