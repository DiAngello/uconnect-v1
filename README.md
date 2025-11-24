# UCONNECT

**UCONNECT** é uma plataforma web voltada para instituições de ensino superior, desenvolvida para centralizar e unificar a comunicação acadêmica em um único ambiente digital.  
O objetivo é substituir a fragmentação causada pelo uso de ferramentas externas (WhatsApp, Telegram, AVA, e-mail institucional) e oferecer uma solução completa para alunos, professores, coordenadores e gestores.

---

## Objetivos do Projeto
- Centralizar comunicação acadêmica em uma única plataforma.  
- Fornecer ferramentas de chat, mural, notificações e eventos acadêmicos.  
- Melhorar a experiência do usuário com uma interface intuitiva e responsiva.  
- Facilitar a gestão de cursos, turmas, comunicados e calendários acadêmicos.  
- Garantir escalabilidade e disponibilidade para milhares de usuários simultâneos.  

---

## Arquitetura
- Frontend: React  
- Backend: Python (FastAPI) + SQLAlchemy + Alembic.  
- Banco de Dados: MySQL 8 (com suporte a replicação e particionamento).  
- Comunicação em tempo real: WebSockets para chat e notificações.  

---

## Documentos do Projeto
- [Documento de Visão](https://docs.google.com/document/d/17QvXX-PnW73Mw7X_FLdqxecfdMuwqBNDaRt9zFGVqu4/edit?usp=sharing)  
- [Documento de Requisitos de Software](https://docs.google.com/document/d/1JtwHiLQE0NPoSPQXBpqkpzLbyT4BuWV7yzwvzv26Tkc/edit?usp=sharing)  
- [Documento de Arquitetura de Software](https://docs.google.com/document/d/1B_UwWRbDoh68XIwu5SCEmP-pHcVJDrmUrrvYdhAlMJ8/edit?usp=sharing)  

---

## Funcionalidades Principais (MVP)
- Cadastro e autenticação de usuários (alunos, professores, coordenadores, admins).  
- Criação e gerenciamento de canais, subcanais e grupos acadêmicos.  
- Envio e recebimento de mensagens em tempo real.  
- Publicação de comunicados, avisos e eventos acadêmicos.  
- Notificações para os usuários.  

---

## Público-Alvo
- Alunos: acesso rápido a chats, eventos, comunicados e notificações.  
- Professores: gerenciamento de turmas, publicações e avisos.  
- Coordenadores/Admins: comunicação oficial e controle global da plataforma.  

---

## Status do Projeto
### Em fase inicial de desenvolvimento (MVP).  
>Estruturação do backend (FastAPI + MySQL) completo e frontend (React + Bootstrap) em andamento.  
>Estabelecimento do banco de dados completo.
>Autenticação de usuários completo.

---

### Pré-requisitos
- Instalar Python 
- Instalar Node.js
- Instalar o NPM em um terminal 
- Configurar variáveis de ambiente no arquivo `.env`  

## Como Executar o Projeto
- Abra dois terminais, um irá executar o setup.py e o outro NPM start.
---

