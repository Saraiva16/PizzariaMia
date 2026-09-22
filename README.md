# 🍕 PizzariaMia

Bem-vindo ao **PizzariaMia**, uma solução completa para a gestão e operação de uma pizzaria. Este sistema tem o objetivo de facilitar desde o recebimento e visualização dos pedidos no lado do cliente (Frontend), até o gerenciamento inteligente, regras de negócio e persistência de dados (Backend). 

## 🛠 Tecnologias Utilizadas

Este projeto foi construído utilizando as seguintes tecnologias:

### Frontend
- **React**: Biblioteca principal para a interface do usuário.
- **TypeScript**: Para uma base de código fortemente tipada e segura.
- **Vite**: Ferramenta de build super rápida para rodar a aplicação localmente.

### Backend & Banco de Dados
- **C# & .NET**: Framework robusto para a criação da Web API.
- **Entity Framework Core**: ORM utilizado para persistência e comunicação com o banco de dados.
- **PostgreSQL**: Banco de dados relacional principal do projeto.

---

## 🚀 Como começar?

Siga os passos abaixo para baixar e rodar a aplicação no seu ambiente de desenvolvimento local.

### 1. Baixando o Repositório

No seu terminal, clone o projeto e acesse a pasta raiz:
```bash
git clone https://github.com/Saraiva16/PizzariaMia.git
cd PizzariaMia
```

### 2. Rodando o Frontend

Para rodar a interface visual da aplicação, abra um terminal e execute os comandos:
```bash
cd Frontend_PizzariaMia
npm install
npm run dev
```
A aplicação abrirá no seu navegador, geralmente no endereço `http://localhost:5173`.

### 3. Configurando o Banco de Dados (PostgreSQL)

O projeto utiliza PostgreSQL. Antes de iniciar a API, siga estes passos:
1. Certifique-se de ter o PostgreSQL rodando localmente.
2. Acesse a pasta `Backend_PizzariaMia`.

> [!WARNING]
> **NÃO COLOQUE SUA SENHA DO BANCO NO `appsettings.json`!**  
> Para evitar vazar credenciais no Git, o projeto utiliza a ferramenta nativa do C# chamada **User Secrets**.
> Em seu terminal (dentro da pasta `Backend_PizzariaMia`), inicialize os segredos e configure sua connection string com a senha real:
> ```bash
> dotnet user-secrets init
> dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=PizzariaMiaDb;Username=seu_usuario;Password=sua_senha_real"
> ```

3. Com a conexão configurada com segurança, crie e atualize as tabelas do banco rodando as *Migrations* do Entity Framework:

```bash
cd Backend_PizzariaMia
dotnet ef database update
```

### 4. Rodando o Backend

Após configurar o banco, instale as dependências e rode a API com:
```bash
# Caso ainda não esteja na pasta
# cd Backend_PizzariaMia
dotnet restore
dotnet run
```
O servidor será iniciado, recebendo as conexões do Frontend e conectando-se ao seu banco PostgreSQL.

---

> Desenvolvido com dedicação para agilizar a entrega da melhor pizza! 🍕
