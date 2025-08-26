# 📌 Project Management App

Aplicação web de **gerenciamento de projetos e tarefas**, desenvolvida em **Node.js** com renderização via **EJS**.  
Permite organizar tarefas, subtarefas, responsáveis e prazos de forma simples, com suporte a login de usuários e gerenciamento administrativo.

---

## 🚀 Funcionalidades

- 📂 **Gerenciamento de Projetos**
  - Cadastro de tarefas e subtarefas
  - Checklists e marcação de concluído
  - Controle de datas e responsáveis

- 👥 **Gestão de Usuários**
  - Tela de login obrigatória (usuário só pode interagir logado)
  - Edição de perfil (nome, e-mail, telefone, senha)
  - Upload de imagem de perfil
  - Administradores podem criar novos usuários
  - No primeiro login, o novo usuário deve definir sua senha

- 💾 **Armazenamento**
  - Banco de dados em **JSON**
  - Salvamento automático do estado de itens expandidos na interface

---

## ⚙️ Como Rodar o Projeto

1. Clone o repositório:
   ```bash
   git clone https://github.com/luanpaula/project-management.git
   cd project-management
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor:
   ```bash
   node server.js
   ```

4. Acesse no navegador:
   ```
   http://localhost:3000
   ```

---

## 📜 Histórico de Versões

- **v1.0.7**  
  - Admins podem criar novos usuários  
  - Novos usuários devem definir senha no primeiro login

- **v1.0.6**  
  - Itens expandidos permanecem expandidos após recarregar a página

- **v1.0.5**  
  - Edição de perfil de usuário (nome, email, telefone, senha)

- **v1.0.4**  
  - Suporte a imagem de perfil  
  - Correções no popup do usuário

- **v1.0.3**  
  - Adicionada tela de login  
  - Bloqueio de ações para usuários não logados  
  - Usuários cadastrados no backend (`server.js`)

- **v1.0.2**  
  - Correção no salvamento de status de tarefas e subtarefas no JSON  
  - Mensagem popup em alterações de checkboxes

- **v1.0.1**  
  - Desenvolvimento inicial com funções básicas

---

## 📎 Desenvolvido por:

🔗 [Luan de Paula](https://www.linkedin.com/in/luandepaula/)

---
