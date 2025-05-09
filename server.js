const express = require('express');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Caminho para o arquivo JSON
const projetosPath = path.join(__dirname, 'data', 'projetos.json');

app.use(express.static('public'));

// Funções utilitárias
function carregarProjetos() {
    const raw = fs.readFileSync(projetosPath, 'utf-8');
    return JSON.parse(raw);
}

function salvarProjetos(projetos) {
    fs.writeFileSync(projetosPath, JSON.stringify(projetos, null, 2), 'utf-8');
}

// Configuração do Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Rotas
app.get('/', (req, res) => {
    const projetos = carregarProjetos();
    res.render('index', {
        title: 'Lista',
        projetos
    });
});

app.get('/create', (req, res) => {
    res.render('create', { title: 'Criar Projeto' });
});

// Projetos
app.post('/projetos', (req, res) => {
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
        tarefas: Array.isArray(tarefas)
            ? tarefas.map(t => ({
                id: uuidv4(),
                titulo: t,
                concluida: false,
                descricao: '',
                status: '',
                dataInicio: '',
                dataPrazo: '',
                dataConclusao: '',
                subtarefas: []
            }))
            : []
    };

    projetos.push(novoProjeto);
    salvarProjetos(projetos);
    res.redirect('/');
});
app.post('/projetos/novo', (req, res) => {
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
app.post('/projetos/:projId', (req, res) => {
    const { projId } = req.params;
    const { campo, valor } = req.body;

    let projetos = carregarProjetos();

    const projeto = projetos.find(p => p.id.trim() === projId.trim());

    if (projeto) {
        if (campo in projeto) {
            projeto[campo] = valor;
            salvarProjetos(projetos);
            return res.json(projeto);
        }
        return res.status(400).json({ error: 'Campo inválido' });
    }

    return res.status(404).json({ error: 'Projeto não encontrado' });
});
app.delete('/projetos/:projId', (req, res) => {
    const { projId } = req.params;
    let projetos = carregarProjetos();

    const index = projetos.findIndex(p => p.id === projId);
    if (index === -1) return res.status(404).json({ error: 'Projeto não encontrado' });

    projetos.splice(index, 1);
    salvarProjetos(projetos);

    res.status(200).json({ message: 'Projeto excluído com sucesso' });
});

// Tarefas
app.post('/projetos/:projId/tarefas', (req, res) => {
    const { projId } = req.params;
    const { nome } = req.body;

    // Validação: se o título estiver vazio, retornamos um erro 400
    if (!nome || nome.trim() === "") {
        return res.status(400).json({ error: "O título da tarefa não pode estar vazio" });
    }

    // Criação da tarefa
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

    // Carregar projetos e procurar o projeto com o id
    let projetos = carregarProjetos();  // Supondo que carregarProjetos seja uma função que carrega os projetos do JSON
    const projeto = projetos.find(p => p.id === projId);

    if (projeto) {
        projeto.tarefas.push(novaTarefa);  // Adiciona a nova tarefa
        salvarProjetos(projetos);  // Salva novamente os projetos (ajuste conforme seu fluxo)
        return res.json(novaTarefa);  // Retorna a nova tarefa como resposta
    } else {
        return res.status(404).json({ error: "Projeto não encontrado" });
    }
});
app.post('/projetos/:projId/tarefas/:tarefaId', (req, res) => {
    const { projId, tarefaId } = req.params;
    const { campo, valor } = req.body;
    const projetos = carregarProjetos();

    const projeto = projetos.find(p => p.id === projId);
    if (!projeto) return res.status(404).json({ erro: "Projeto não encontrado" });

    const tarefa = projeto.tarefas.find(t => t.id === tarefaId);
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada" });

    tarefa[campo] = valor;
    salvarProjetos(projetos);

    res.status(200).json({ sucesso: true });
});
app.delete('/projetos/:projId/tarefas/:tarefaId', (req, res) => {
    const { projId, tarefaId } = req.params;
    let projetos = carregarProjetos();

    const projeto = projetos.find(p => p.id === projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const index = projeto.tarefas.findIndex(t => t.id === tarefaId);
    if (index === -1) return res.status(404).json({ error: 'Tarefa não encontrada' });

    projeto.tarefas.splice(index, 1);
    salvarProjetos(projetos);

    res.status(200).json({ message: 'Tarefa excluída com sucesso' });
});

// Subtarefas
app.post('/projetos/:projId/tarefas/:tarefaId/subtarefas', (req, res) => {
    const { projId, tarefaId } = req.params;
    const { titulo } = req.body;
    const projetos = carregarProjetos()

    console.log(`Recebendo dados para criar subtarefa: projId=${projId}, tarefaId=${tarefaId}, titulo=${titulo}`);

    const projeto = projetos.find(p => p.id === projId);
    if (!projeto) {
        console.log(`Projeto não encontrado: ${projId}`);
        return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    const tarefa = projeto.tarefas.find(t => t.id === tarefaId);
    if (!tarefa) {
        console.log(`Tarefa não encontrada: ${tarefaId}`);
        return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    const novaSubtarefa = {
        id: uuidv4(),
        titulo,
        concluida: false,
    };

    // Garante que a lista de subtarefas exista
    tarefa.subtarefas = tarefa.subtarefas || [];
    tarefa.subtarefas.push(novaSubtarefa);

    salvarProjetos(projetos);

    res.status(201).json(novaSubtarefa); // Retorna a subtarefa criada
});
app.post('/projetos/:projId/tarefas/:tarefaId/subtarefas/:subtarefaId', (req, res) => {
    const { projId, tarefaId, subtarefaId } = req.params;
    const { titulo, concluida } = req.body;
    const projetos = carregarProjetos();

    const projeto = projetos.find(p => p.id === projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const tarefa = projeto.tarefas.find(t => t.id === tarefaId);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const subtarefa = tarefa.subtarefas?.find(st => st.id === subtarefaId);
    if (!subtarefa) return res.status(404).json({ error: 'Subtarefa não encontrada' });

    // Atualiza apenas o que foi enviado
    if (titulo !== undefined) subtarefa.titulo = titulo;
    if (concluida !== undefined) subtarefa.concluida = concluida;

    salvarProjetos(projetos);

    res.json({ message: 'Subtarefa atualizada com sucesso', subtarefa });
});
app.delete('/projetos/:projId/tarefas/:tarefaId/subtarefas/:subtarefaId', (req, res) => {
    const { projId, tarefaId, subtarefaId } = req.params;
    let projetos = carregarProjetos();

    const projeto = projetos.find(p => p.id === projId);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });

    const tarefa = projeto.tarefas.find(t => t.id === tarefaId);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });

    const index = tarefa.subtarefas?.findIndex(st => st.id === subtarefaId);
    if (index === -1 || index === undefined) return res.status(404).json({ error: 'Subtarefa não encontrada' });

    tarefa.subtarefas.splice(index, 1);
    salvarProjetos(projetos);

    res.status(200).json({ message: 'Subtarefa excluída com sucesso' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});