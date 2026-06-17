// Importa a folha de estilo para ser empacotada pelo Vite
import './styles.css';

// Importa todos os módulos JS na ordem de dependência original
import './js/config.js';
import './js/utils.js';
import './js/auth.js';
import './js/roles.js';
import './js/ai.js';
import './js/diary.js';
import './js/compare.js';
import './js/professional.js';
import './js/admin.js';
import './js/account.js';
import './js/patches.js';

console.log('[CalorIA] Entrada principal carregada e módulos ES importados com sucesso!');
