# Sports Manager

A sports team management app for coaches and players. Coaches create and manage teams, build playbooks with a built-in drawing tool, manage rosters, and invite players. Players join via invite link and get a view of their team info, schedule, and playbooks.

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS (PWA)
- **Backend:** Go (`net/http`)
- **Database:** PostgreSQL
- **Auth:** Email/password + Google OAuth (JWT in httpOnly cookies)

## Features (MVP — Basketball)

- **Auth** — Email/password and Google OAuth for coaches and players
- **Teams** — Coaches can create and manage multiple teams
- **Roster** — Invite players by email; players accept via link
- **Playbooks** — Create playbooks per team with an interactive canvas drawing tool (player positions, movement arrows, annotations)

## Getting Started

> Setup instructions will be added once the project is scaffolded.

## Project Status

Currently in design phase. See [TODO.md](./TODO.md) for the build roadmap.
