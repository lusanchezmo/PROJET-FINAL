# 🛡️ CyberSec Assistant UPHF

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)
![Docker](https://img.shields.io/badge/Déploiement-Docker-2496ED?logo=docker&logoColor=white)
![Institution](https://img.shields.io/badge/Institution-INSA_UPHF-red.svg)

Un agent conversationnel intelligent (Chatbot) conçu pour accompagner les étudiants et le personnel de l'**Institut National des Sciences Appliquées Hauts-de-France (UPHF)** sur les questions de cybersécurité. Le système intègre la reconnaissance vocale, la mémorisation du contexte et une architecture RAG (Retrieval-Augmented Generation) pour fournir des réponses fiables et sourcées.

---

## 📑 Table des Matières
1. [À Propos du Projet](#-à-propos-du-projet)
2. [Technologies Utilisées](#-technologies-utilisées)
3. [Images Docker](#-images-docker)
4. [Installation et Lancement](#-installation-et-lancement)
5. [Documentation & Architecture](#-documentation--architecture)

---

## 💡 À Propos du Projet

Ce projet de 4ème année (INFO et Cybersécurité) répond aux exigences d'accessibilité multiplateforme (PC/Mobile) et d'une approche agentique sécurisée. L'assistant permet aux utilisateurs de :
* Poser des questions de cybersécurité par **texte** ou par **commande vocale**.
* Poursuivre une conversation multi-tours grâce à la mémorisation des sessions.
* Obtenir des informations spécifiques à l'infrastructure de l'UPHF.
* Consulter les sources documentaires ayant permis à l'IA de générer sa réponse (réduction des hallucinations).


---

## 🛠️ Technologies Utilisées

### 🎨 Frontend (Client)
* **React** : Interface utilisateur responsive (Web & Mobile).
* **API Web Speech** : Intégration native pour la reconnaissance des commandes vocales.

### ⚙️ Backend (Serveur)
* **FastAPI (Python)** : API REST ultra-rapide et légère.
* **LangChain** : Orchestrateur pour la logique de l'agent IA et le traitement du RAG.
* **Hugging Face Inference API** : Modèle LLM optimisé pour la cybersécurité.

### 🗄️ Bases de Données
* **MongoDB** : Stockage orienté document. Choisi pour sa performance par dénormalisation (les messages et métadonnées sont directement intégrés dans les documents de *Sessions*).
* **FAISS** : Base de données vectorielle permettant la recherche de similarité ultra-rapide sur les documents de l'UPHF.

---

## 🐳 Images Docker

Le projet est entièrement conteneurisé. Vous pouvez retrouver les images prêtes à l'emploi sur notre registre :

* 🌐 **Frontend React :** [https://hub.docker.com/r/sanchezmolinaluisdaniel/wiliwili-chat-frontend](#)
* ⚙️ **Backend FastAPI :** [https://hub.docker.com/r/sanchezmolinaluisdaniel/uphf-rag-backend](#)

---

## 🚀 Installation et Lancement

### Prérequis
* [Docker](https://docs.docker.com/get-docker/) et [Docker Compose](https://docs.docker.com/compose/install/) installés sur votre machine.
* Clé API Hugging Face (pour le modèle LLM).

### Étape 1 : Cloner le dépôt
```bash
git clone [https://github.com/lusanchezmo/PROJET-FINAL]
cd PROJET-FINAL
```

##  Documentation & Architecture
 <img width="405" height="440" alt="image" src="https://github.com/user-attachments/assets/a840b623-17a1-4a79-9e30-fa9c4620502f" />

 Pour répondre aux exigences d'accessibilité multiplateforme (PC/Mobile), de conteneurisation (Docker) et d'une approche agentique, le meilleur choix est une Architecture Client-Serveur (C/S) orientée Microservices. Cela permet de séparer l'interface utilisateur de la logique de l'agent d'Intelligence Artificielle. 

 ### Modélisation des Données (BDD) 

 <img width="778" height="392" alt="image" src="https://github.com/user-attachments/assets/20900f16-1405-47d8-b16e-81e0908b8a09" />

 Le choix d'un modèle orienté documents avec MongoDB, se justifie par un argument technique majeur : la performance par Dénormalisation le diagramme met en évidence des relations d'agrégation forte : « Intègre (1 à N) » pour la classe Message et « Intègre (1 à 1) » pour Metadonnees. Dans MongoDB, ces classes ne forment pas des tables séparées, mais sont directement embarquées (sous forme de tableau d'objets ou de sous-document) au sein de la collection principale Sessions. Cela élimine le besoin de jointures SQL coûteuses (JOIN), permettant à FastAPI de récupérer l'intégralité de l'historique d'un échange en une seule lecture ultra-rapide.

 ### Diagramme de cas d’utilisation 
 
 <img width="983" height="395" alt="image" src="https://github.com/user-attachments/assets/680d86ae-f5da-45b6-8493-1acb89f6bf6a" />

Ce diagramme présente les principales interactions entre l’utilisateur et l’application CyberSec Assistant UPHF. 
L’utilisateur peut poser une question en texte ou par commande vocale, consulter la réponse générée par le chatbot, accéder aux sources documentaires utilisées et poursuivre une conversation sur plusieurs échanges. 
Le système permet également de répondre à certaines questions liées aux dispositifs de cybersécurité de l’UPHF.

### Diagramme de cas d’utilisation 

<img width="920" height="748" alt="image" src="https://github.com/user-attachments/assets/3a75eb50-fe85-4701-850f-3d3e2d67145c" />

Ce diagramme de séquence décrit le déroulement principal lorsqu’un utilisateur pose une question au chatbot. 
La question est envoyée depuis l’interface React vers l’API FastAPI. Le backend récupère l’historique de conversation dans MongoDB afin de conserver le contexte, puis transmet la demande à LangChain. LangChain interroge la base vectorielle FAISS pour récupérer les documents les plus pertinents, construit le prompt et appelle le modèle de langage HuggingFace. 
La réponse générée est ensuite sauvegardée dans MongoDB avec les métadonnées associées, puis renvoyée à l’interface avec les sources utilisées.

### Diagramme de classe

<img width="872" height="585" alt="image" src="https://github.com/user-attachments/assets/371899b9-6825-4a6e-8b95-2e961dd9698f" />

Ce diagramme de classes présente les principales entités de l’application CyberSec Assistant UPHF. Un utilisateur peut créer plusieurs sessions de discussion. 
Chaque session contient un historique de messages ainsi que des métadonnées associées aux échanges, telles que le temps de réponse et les sources utilisées. 
Le ChatService représente le composant principal chargé du traitement des questions. Il exploite les documents de la base de connaissances afin de générer une réponse adaptée qui sera retournée à l’utilisateur. 

### 🧪 Qualité et Tests
Afin de garantir la stabilité de l'application, une stratégie de test a été mise en place :

Tests Unitaires et d'Intégration (Backend) : Utilisation de pytest pour valider la logique de l'API FastAPI et les interactions avec les bases de données.

Tests Frontend : Utilisation de vitest pour s'assurer du bon formatage des composants React.
