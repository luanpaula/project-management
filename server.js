const express = require('express');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');

const app = express();
const PORT = 3000;

// ========== MIDDLEWARES ==========
app.use(session({
    secret: 'aR8fT$#9zLkP0vY@jWq1uB7eNxMgXcZ2e3tUoR!4',
    resave: false,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== CONFIGURAÇÕES ==========
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// ========== DADOS ==========
const projetosPath = path.join(__dirname, 'data', 'projetos.json');

const usuarios = [
    { username: 'admin', senha: 'admin' }
];

// ========== FUNÇÕES AUXILIARES ==========
function carregarProjetos() {
    if (!fs.existsSync(projetosPath)) return [];
    const raw = fs.readFileSync(projetosPath, 'utf-8');
    return JSON.parse(raw || '[]');
}

function salvarProjetos(projetos) {
    fs.writeFileSync(projetosPath, JSON.stringify(projetos, null, 2), 'utf-8');
}

function autenticar(req, res, next) {
    if (req.session && req.session.usuario) {
        next();
    } else {
        res.redirect('/login');
    }
}

// ========== ROTAS DE LOGIN ==========
app.get('/login', (req, res) => {
    res.render('login', { title: 'Login', erro: null });
});

app.post('/login', (req, res) => {
    const { username, senha } = req.body;
    const usuario = usuarios.find(u => u.username === username && u.senha === senha);

    if (usuario) {
        req.session.usuario = usuario.username;
        res.redirect('/');
    } else {
        res.render('login', { title: 'Login', erro: 'Usuário ou senha inválidos' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// ========== ROTAS DE PROJETOS ==========
app.get('/', autenticar, (req, res) => {
    const projetos = carregarProjetos();
    res.render('index', { title: 'Lista', projetos });
});

app.get('/create', autenticar, (req, res) => {
    res.render('create', { title: 'Criar Projeto' });
});

app.post('/projetos', autenticar, (req, res) => {
    const { nome, descricao, status, dataInicio, dataPrazo, dataConclusao, tarefas } = req.body;
    const projetos = carregarProjetos();

    const novoProjeto = {
        id: uuidv4(),
        nome,
        descricao,
        status,
        dataInicio,
        dataPrazo,
        dataConclusao,
        tarefas: Array.isArray(tarefas) ? tarefas.map(t => ({
            id: uuidv4(),
            titulo: t,
            concluida: false,
            descricao: '',
            status: '',
            dataInicio: '',
            dataPrazo: '',
            dataConclusao: '',
            subtarefas: []
        })) : []
    };

    projetos.push(novoProjeto);
    salvarProjetos(projetos);
    res.redirect('/');
});

app.post('/projetos/novo', autenticar, (req, res) => {
    const { nome } = req.body;
    const projetos = carregarProjetos();

    const novoProjeto = {
        id: uuidv4(),
        nome,
        descricao: '',
        status: '',
        dataInicio: '',
        dataPrazo: '',
        dataConclusao: '',
        tarefas: []
    };

    projetos.push(novoProjeto);
    salvarProjetos(projetos);
    res.json({ sucesso: true, id: novoProjeto.id, nome: novoProjeto.nome });
});

app.post('/projetos/:projId', autenticar, (req, res) => {
    const { projId } = req.params;
    const { campo, valor } = req.body;
    let projetos = carregarProjetos();

    const projeto = projetos.find(p => p.id === projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    if (!(campo in projeto)) return res.status(400).json({ error: 'Campo inválido' });

    projeto[campo] = valor;
    salvarProjetos(projetos);
    res.json(projeto);
});

app.delete('/projetos/:projId', autenticar, (req, res) => {
    let projetos = carregarProjetos();
    const index = projetos.findIndex(p => p.id === req.params.projId);

    if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });

    projetos.splice(index, 1);
    salvarProjetos(projetos);
    res.json({ message: 'Projeto excluído com sucesso' });
});

// ========== ROTAS DE TAREFAS ==========
app.post('/projetos/:projId/tarefas', autenticar, (req, res) => {
    const { nome } = req.body;
    if (!nome || nome.trim() === "") {
        return res.status(400).json({ error: "O título da tarefa não pode estar vazio" });
    }

    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: "Projeto não encontrado" });

    const novaTarefa = {
        id: uuidv4(),
        titulo: nome,
        concluida: false,
        descricao: '',
        status: '',
        dataInicio: '',
        dataPrazo: '',
        dataConclusao: '',
        subtarefas: []
    };

    projeto.tarefas.push(novaTarefa);
    salvarProjetos(projetos);
    res.json(novaTarefa);
});

app.post('/projetos/:projId/tarefas/:tarefaId', autenticar, (req, res) => {
    const { campo, valor } = req.body;
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const tarefa = projeto.tarefas.find(t => t.id === req.params.tarefaId);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    tarefa[campo] = valor;
    salvarProjetos(projetos);
    res.json({ sucesso: true });
});

app.delete('/projetos/:projId/tarefas/:tarefaId', autenticar, (req, res) => {
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const index = projeto.tarefas.findIndex(t => t.id === req.params.tarefaId);
    if (index === -1) return res.status(404).json({ error: 'Tarefa não encontrada' });

    projeto.tarefas.splice(index, 1);
    salvarProjetos(projetos);
    res.json({ message: 'Tarefa excluída com sucesso' });
});

// ========== ROTAS DE SUBTAREFAS ==========
app.post('/projetos/:projId/tarefas/:tarefaId/subtarefas', autenticar, (req, res) => {
    const { titulo } = req.body;
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const tarefa = projeto.tarefas.find(t => t.id === req.params.tarefaId);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const novaSubtarefa = { id: uuidv4(), titulo, concluida: false };
    tarefa.subtarefas = tarefa.subtarefas || [];
    tarefa.subtarefas.push(novaSubtarefa);

    salvarProjetos(projetos);
    res.status(201).json(novaSubtarefa);
});

app.post('/projetos/:projId/tarefas/:tarefaId/subtarefas/:subtarefaId', autenticar, (req, res) => {
    const { titulo, concluida } = req.body;
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const tarefa = projeto.tarefas.find(t => t.id === req.params.tarefaId);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const subtarefa = tarefa.subtarefas?.find(st => st.id === req.params.subtarefaId);
    if (!subtarefa) return res.status(404).json({ error: 'Subtarefa não encontrada' });

    if (titulo !== undefined) subtarefa.titulo = titulo;
    if (concluida !== undefined) subtarefa.concluida = concluida;

    salvarProjetos(projetos);
    res.json({ message: 'Subtarefa atualizada com sucesso', subtarefa });
});

app.delete('/projetos/:projId/tarefas/:tarefaId/subtarefas/:subtarefaId', autenticar, (req, res) => {
    const projetos = carregarProjetos();
    const projeto = projetos.find(p => p.id === req.params.projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const tarefa = projeto.tarefas.find(t => t.id === req.params.tarefaId);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const index = tarefa.subtarefas?.findIndex(st => st.id === req.params.subtarefaId);
    if (index === -1 || index === undefined) return res.status(404).json({ error: 'Subtarefa não encontrada' });

    tarefa.subtarefas.splice(index, 1);
    salvarProjetos(projetos);
    res.json({ message: 'Subtarefa excluída com sucesso' });
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});