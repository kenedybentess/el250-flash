// Sistema de Autenticação e Permissões - Leitores PRO v2
// admin = acesso total | operador = testes + etiquetas + logs
// Agora com criação de novos usuários

(function(){
    const ADMIN_USER = 'admin';
    const ADMIN_PASS = '123';

    function getOperadores(){
        try { return JSON.parse(localStorage.getItem('operadores')||'[]'); } catch { return []; }
    }
    function setOperadores(lista){
        localStorage.setItem('operadores', JSON.stringify(lista));
    }

    function getSession(){
        try {
            return {
                logged: sessionStorage.getItem('logged') === 'true',
                role: sessionStorage.getItem('user_role') || '',
                nome: sessionStorage.getItem('user_nome') || '',
                matricula: sessionStorage.getItem('user_matricula') || '',
                id: sessionStorage.getItem('user_id') || '',
                usuario: sessionStorage.getItem('user_usuario') || ''
            };
        } catch { return {logged:false, role:'', nome:'', matricula:'', id:'', usuario:''}; }
    }

    function saveSession({role, nome, matricula, id, usuario}){
        sessionStorage.setItem('logged','true');
        sessionStorage.setItem('user_role', role);
        sessionStorage.setItem('user_nome', nome);
        sessionStorage.setItem('user_matricula', matricula);
        sessionStorage.setItem('user_id', id || matricula);
        sessionStorage.setItem('user_usuario', usuario || matricula);
    }

    function clearSession(){
        ['logged','user_role','user_nome','user_matricula','user_id','user_usuario'].forEach(k=>sessionStorage.removeItem(k));
    }

    function isAdmin(session){
        const s = session || getSession();
        return s.logged && s.role === 'admin';
    }

    function isOperador(session){
        const s = session || getSession();
        return s.logged && s.role === 'operador';
    }

    // NOVA FUNÇÃO: Criar usuário
    function criarUsuario({nome, matricula, usuario, senha, perfil='operador', setor='Produção', turno='Manhã', status='Ativo'}){
        nome = (nome||'').trim();
        matricula = (matricula||'').trim();
        usuario = (usuario||'').trim() || matricula; // se não informar usuário, usa matrícula
        senha = (senha||'').trim();
        perfil = (perfil||'operador').toLowerCase();

        if(!nome || !matricula || !senha) return {ok:false, msg:'Nome, matrícula e senha são obrigatórios'};
        if(senha.length < 3) return {ok:false, msg:'Senha deve ter no mínimo 3 caracteres'};
        if(!['admin','operador'].includes(perfil)) perfil = 'operador';

        const ops = getOperadores();
        if(ops.some(o => o.matricula.toLowerCase() === matricula.toLowerCase())) return {ok:false, msg:'Matrícula já cadastrada'};
        if(ops.some(o => (o.usuario||o.matricula).toLowerCase() === usuario.toLowerCase())) return {ok:false, msg:'Usuário já existe'};

        const novo = {
            id: Date.now().toString(),
            matricula, nome, usuario, senha,
            perfil, // admin | operador
            setor: setor || 'Produção',
            turno: turno || 'Manhã',
            status: status || 'Ativo',
            criadoEm: new Date().toISOString()
        };
        ops.push(novo);
        setOperadores(ops);
        return {ok:true, msg:'Usuário criado com sucesso', user:novo};
    }

    function tentarLogin(usuario, senha){
        const u = (usuario||'').trim();
        const p = (senha||'').trim();
        if(!u || !p) return {ok:false, msg:'Preencha usuário e senha'};

        // 1 - admin fixo (sempre funciona)
        if(u.toLowerCase() === ADMIN_USER && p === ADMIN_PASS){
            saveSession({role:'admin', nome:'Administrador', matricula:'ADMIN', id:'admin', usuario:'admin'});
            return {ok:true, role:'admin'};
        }

        // 2 - operadores cadastrados
        const ops = getOperadores();
        let op = ops.find(o => o.status === 'Ativo' && (o.matricula.toLowerCase() === u.toLowerCase() || (o.usuario && o.usuario.toLowerCase() === u.toLowerCase())));
        if(op){
            const senhaCorreta = op.senha || op.matricula;
            if(p === senhaCorreta){
                const role = (op.perfil === 'admin') ? 'admin' : 'operador';
                saveSession({role, nome: op.nome, matricula: op.matricula, id: op.id, usuario: op.usuario || op.matricula});
                return {ok:true, role, nome: op.nome};
            } else {
                return {ok:false, msg:'Senha inválida'};
            }
        }

        return {ok:false, msg:'Usuário ou senha inválidos'};
    }

    function requireLogin(){
        const s = getSession();
        if(!s.logged){
            const current = window.location.pathname.split('/').pop() || 'index.html';
            if(current !== 'index.html' && current !== ''){
                window.location.href = 'index.html';
            }
            return false;
        }
        return true;
    }

    function requirePermission(){
        const s = getSession();
        if(!s.logged) return requireLogin();
        const pagina = (window.location.pathname.split('/').pop()||'').toLowerCase();
        const paginasOperador = ['testes.html', 'logs.html', 'etiquetas.html']; 
        const paginasLivres = ['index.html','']; 
        const paginasBloqueadasOperador = ['produtos.html','operadores.html','historico.html','relatorios.html'];

        if(s.role === 'operador'){
            if(paginasLivres.includes(pagina)){
                if(pagina === 'index.html' || pagina === ''){
                    window.location.href = 'testes.html';
                }
                return false;
            }
            if(paginasBloqueadasOperador.includes(pagina)){
                alert('Acesso restrito: operadores só podem acessar Testes, Etiquetas e Meus Logs');
                window.location.href = 'testes.html';
                return false;
            }
            if(!paginasOperador.includes(pagina)){
                alert('Acesso restrito: operadores só podem acessar a tela de Testes');
                window.location.href = 'testes.html';
                return false;
            }
        }
        return true;
    }

    function aplicarVisualPermissoes(){
        const s = getSession();
        if(!s.logged) return;
        const elsNome = document.querySelectorAll('#nomeUsuario, #userName, .user-name-display');
        elsNome.forEach(el=>{
            el.innerHTML = `${s.nome} <span class="badge ${s.role==='admin'?'bg-danger':'bg-success'} ms-2" style="font-size:10px">${s.role.toUpperCase()}</span>`;
        });
        if(s.role === 'operador'){
            document.querySelectorAll('.sidebar a').forEach(a=>{
                const href = (a.getAttribute('href')||'').toLowerCase();
                if(href.includes('produtos.html') || href.includes('operadores.html') || href.includes('historico') || href.includes('relatorios') || href.includes('index.html')){
                    const li = a.closest('li');
                    if(li) li.style.display='none';
                    else a.style.display='none';
                }
                if(href.includes('testes.html')) a.classList.add('active');
                if(href.includes('logs.html')){
                    a.innerHTML = '<i class="bi bi-person-check"></i> Meus Testes';
                    const li = a.closest('li');
                    if(li) li.style.display='';
                }
            });
            document.querySelectorAll('.top-nav a, .menu-dropdown a').forEach(a=>{
                const href=(a.getAttribute('href')||'').toLowerCase();
                if(href.includes('produtos.html') || href.includes('operadores.html') || href.includes('historico.html') || href.includes('relatorios.html')){
                    if(document.getElementById('menuDropdown') && a.closest('#menuDropdown')) a.style.display='none';
                }
                if(href.includes('logs.html')){
                    a.innerHTML = '<i class="bi bi-person-check"></i> Meus Logs';
                    a.style.display='';
                }
            });
            document.querySelectorAll('[data-admin-only]').forEach(b=>b.style.display='none');
        }
    }

    function logout(){
        clearSession();
        window.location.href = 'index.html';
    }

    window.AuthSystem = {
        getSession, isAdmin, isOperador, tentarLogin, criarUsuario, getOperadores, setOperadores,
        requireLogin, requirePermission, aplicarVisualPermissoes, logout, saveSession, clearSession
    };

    document.addEventListener('DOMContentLoaded', ()=>{
        const pagina = (window.location.pathname.split('/').pop()||'').toLowerCase();
        if(pagina !== 'index.html' && pagina !== ''){
            if(!requireLogin()) return;
            requirePermission();
            aplicarVisualPermissoes();
        }
    });
})();
