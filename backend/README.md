# API de l'Agent de Sécurité Virtuel de l'UPHF

Ce dépôt contient le backend asynchrone pour l'**Agent de Sécurité virtuel de l'UPHF**. Il s'agit d'une architecture basée sur **FastAPI** qui implémente un moteur **RAG (Retrieval-Augmented Generation)** multi-tour pour répondre aux questions sur les réglementations de cybersécurité et les informations institutionnelles, intégrant **MongoDB** via des opérations atomiques pour la persistance de l'historique de conversation des étudiants.

---

## 🏗️ Architecture du Système

L'écosystème est entièrement orchestré avec **Docker Compose** et se divise en deux couches principales :

1.  **uphf-api (FastAPI) :** Service applicatif qui héberge le pipeline LangChain, le moteur d'embeddings locaux d'HuggingFace (`all-MiniLM-L6-v2`), la base de données vectorielle en mémoire **FAISS** et le client asynchrone **Motor** pour MongoDB. Le LLM utilisé est `Qwen/QwQ-32B` via l'infrastructure d'inférence d'HuggingFace Router.
2.  **mongo-db (MongoDB 6.0) :** Base de données NoSQL chargée de stocker les documents des sessions de chat de manière indexée grâce à des combinaisons uniques d'utilisateurs et de conversations.

---

## 🛠️ Prérequis

Avant de déployer l'application, assurez-vous d'avoir installé :
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (qui inclut Docker Compose).
* Un fichier `.env` à la racine du dossier `backend` avec votre jeton d'API :

```env
HUGGINGFACEHUB_API_TOKEN=votre_token_ici
```

---

## 🚀 Déploiement et Initialisation

Pour lancer l'ensemble de l'écosystème (API + Base de données) pour la première fois, ouvrez un terminal à la racine du projet et exécutez :

```env
docker compose up --build -d
```

## 🔄 Gestion du Cycle de Vie de Docker

```env
docker compose down --> Arrêter l'infrastructure
docker compose up -d --> Lancer / Reprendre l'infrastructure

docker compose build --no-cache uphf-api --> Reconstruire l'API après modification du code
docker compose up -d

docker compose logs -f uphf-api --> Suivre les logs en temps réel

```