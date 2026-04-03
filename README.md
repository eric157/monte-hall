# Monty Hall 3D Lab

A visual simulator of the Monty Hall problem with:

- 3D door animation using your PNG assets (`close-door`, `open-door`, `poop`, `gold-bar`)
- live trial stats (stay vs switch win rates)
- Bayesian posterior tracking with a chart
- beginner-friendly intuition plus formal probability explanation in-app
- a polished Jupyter notebook walkthrough (`monte-hall.ipynb`)

## Project Structure

- `monty-3d/index.html` - app layout and explanation content
- `monty-3d/style.css` - visual design and responsive layout
- `monty-3d/main.js` - 3D scene, trial simulation, decision trace, animation
- `monty-3d/bayesian.js` - Bayesian updates and chart rendering
- `monty-3d/assets/` - door and reward/goat PNG assets

## Quick Start

From the repo root:

```bash
cd monty-3d
python -m http.server 4173
```

Open:

`http://127.0.0.1:4173/index.html`

## What You Should Observe

- staying converges near `1/3`
- switching converges near `2/3`
- Bayesian posterior means stabilize around the same values as trials increase

## Why Switching Wins (short)

Your first pick is correct with probability `1/3` and wrong with probability `2/3`.
The host always opens a goat door that is not your pick and not the prize.
So after the reveal, the remaining unopened door carries the `2/3` mass, making switching the better strategy.
