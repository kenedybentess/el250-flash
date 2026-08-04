// Sistema de Autenticação e Permissões - Leitores PRO
// REGRA: admin = tudo | operador = somente testes.html
(function(){
    const ADMIN_USER = 'admin';
    const ADMIN_PASS = '123';
    function getOperadores(){
        try { return JSON.parse(localStorage.getItem('operadores')||'[]'); } catch { return []; }
    }
    function getSession(){
        try {
            return {
                logged: sessionStorage.getItem('logged') === 'true',
                role: sessionStorage.getItem('user_role') || '',
                nome: sessionStorage.getItem('user_nome') || '',
                matricula: sessionStorage.getItem('user_matricula') || '',
                id: sessionStorage.getItem('user_id') || ''
            };
        } catch { return {logged:false, role:'', nome:'', matricula:'', id:''}; }
    }
    function saveSession(obj){
        sessionStorage.setItem('logged','true');
        sessionStorage.setItem('user_role', obj.role);
        sessionStorage.setItem('user_nome', obj.nome);
        sessionStorage.setItem('user_matricula', obj.matricula);
        sessionStorage.setItem('user_id', obj.id || obj.matricula);
    }
    function clearSession(){ sessionStorage.clear(); }
    function tentarLogin(usuario, senha){
        const u = (usuario||'').trim();
        const p = (senha||'').trim();
        if(!u || !p) return {ok:false, msg:'Preencha usuario e senha'};
        if(u.toLowerCase() === ADMIN_USER && p === ADMIN_PASS){
            saveSession({role:'admin', nome:'Administrador', matricula:'ADMIN', id:'admin'});
            return {ok:true, role:'admin', redirect:'index.html'};
        }
        const ops = getOperadores();
        let op = ops.find(o => o.matricula.toLowerCase() === u.toLowerCase() && o.status === 'Ativo');
        if(!op) op = ops.find(o => (o.usuario && o.usuario.toLowerCase() === u.toLowerCase()) && o.status === 'Ativo');
        if(op){
            const senhaCorreta = op.senha || op.matricula;
            if(p === senhaCorreta){
                const role = (op.perfil === 'admin') ? 'admin' : 'operador';
                saveSession({role, nome: op.nome, matricula: op.matricula, id: op.id});
                if(role === 'operador'){
                    return {ok:true, role, redirect:'testes.html'};
                }
                return {ok:true, role, redirect:'index.html'};
            } else {
                return {ok:false, msg:'Senha invalida'};
            }
        }
        return {ok:false, msg:'Usuario ou senha invalidos'};
    }
    function requireLogin(){
        const s = getSession();
        if(!s.logged){
            const current = (window.location.pathname.split('/').pop()||'').toLowerCase();
            if(!['login.html',''].includes(current)){
                window.location.href = 'login.html';
            }
            return false;
        }
        return true;
    }
    function requirePermission(){
        const s = getSession();
        if(!s.logged) return requireLogin();
        const pagina = (window.location.pathname.split('/').pop()||'').toLowerCase();
        if(['login.html',''].includes(pagina)) return true;
        if(s.role === 'operador'){
            if(pagina !== 'testes.html'){
                window.location.href = 'testes.html';
                return false;
            }
        }
        return true;
    }
    function aplicarVisualPermissoes(){
        const s = getSession();
        if(!s.logged) return;
        const elsNome = document.querySelectorAll('#nomeUsuario, #userName, .user-name-display, #nomeUsuarioTeste');
        elsNome.forEach(el=>{
            el.innerHTML = s.nome + ' <span class="badge ' + (s.role==='admin'?'bg-danger':'bg-success') + ' ms-2" style="font-size:10px">' + s.role.toUpperCase() + '</span>';
        });
        if(s.role === 'operador'){
            document.querySelectorAll('.sidebar a, .top-nav a, .menu-dropdown a, #mainTabs button').forEach(a=>{
                const href = (a.getAttribute('href')||'').toLowerCase();
                const txt = (a.textContent||'').toLowerCase();
                const isEtiquetas = href.includes('etiquetas') || txt.includes('etiqueta') || a.id === 'btnTabEtiquetas';
                if(isEtiquetas){ a.style.display='none'; }
            });
            document.querySelectorAll('[data-admin-only]').forEach(b=>b.style.display='none');
        }
    }
    function logout(){
        clearSession();
        window.location.href = 'login.html';
    }
    window.AuthSystem = { getSession, tentarLogin, requireLogin, requirePermission, aplicarVisualPermissoes, logout, saveSession, clearSession };
    document.addEventListener('DOMContentLoaded', ()=>{
        const pagina = (window.location.pathname.split('/').pop()||'').toLowerCase();
        if(pagina !== 'login.html' && pagina !== ''){
            if(!requireLogin()) return;
            requirePermission();
            setTimeout(aplicarVisualPermissoes, 100);
        }
    });
})();
