---
title: 'AI for game assets: what I actually kept in my indie game'
description: 'Sprites vs sound effects: what AI could and couldn''t do for a solo dev building a Godot game.'
pubDate: 2026-10-03
tags: ['gamedev', 'godot', 'ai']
draft: false
---

AI got my sound effects across the line, but it couldn't animate my characters. That's the short version of a few months of using AI tools on real assets for my indie game.

I'm a backend tech lead by day, and I'm building the game solo. No artist, no sound designer, no budget for either at the start. So AI looked like the obvious shortcut. This post is what actually happened: what I kept, what I dropped, and what I'd tell another solo dev before they start.

## The game and the bar it sets

The game is a 2D strategy game in early development. It's made in Godot 4, uses 2D cartoon style art, and targets Android and PC.

That sets three requirements for assets:

- **Readable at phone size.** A unit has to be recognizable in a fraction of a second, in a crowd.
- **Consistent.** Every frame of every animation has to look like the same creature.
- **Mixable.** Sound effects fire constantly and overlap, so their levels have to sit together without anything spiking or vanishing.

A tool that produces a great-looking single image can still fail all three.

## Sprites: where AI fell short

I used ludo.ai to generate character spritesheets. The idea was simple: describe a character, get a sheet of walk, attack and death frames, drop it into Godot.

Individual frames often looked fine. The problem was everything between them:

- **Frame-to-frame consistency.** Proportions, colors and details drifted from one frame to the next. Played in sequence, the creature subtly changed shape.
- **The animation itself.** The motion didn't read as a believable walk or attack cycle. Poses didn't flow into each other, so loops stuttered or looked like a slideshow.

This is the base character draw that I used for an idle animation:

![Base character drawing used for the idle animation](/blog/ai-for-game-assets/base-character.png)

And this is the first generated idle animation:

<video src="/blog/ai-for-game-assets/idle-attempt-1.mp4" autoplay loop muted playsinline></video>

You can see that it is almost good and in the first try looks very smooth and correct. But lets go with the next iteration, because the mouth is really weird and I dont like it:

<video src="/blog/ai-for-game-assets/idle-attempt-2.mp4" autoplay loop muted playsinline></video>

Oh my lord... why I touched anything. So the video explain it self about the randomly changes in the animation, when I only want a normal mouth. But lets iterate again and see if its better or not:

<video src="/blog/ai-for-game-assets/idle-attempt-3.mp4" autoplay loop muted playsinline></video>

Okey... so now there is something much better but for any reason the mouth are now the eyes and the nose looks like an ear, maybe?

But the animation looks really smooth and I burned a lot of tokens just to achieve this and didnt want to empty my wallet so I decied to adjust manually the animation. I didnt have the final version because I did this long time ago and I unfortunatly lost it. But I think that what I want to transmit is clear, im not a profesional designer or animation but Im a passionate about videogames and I want to create a piece that will feel proud in the future.

So in short if you want to achieve a profesional like results and you are not an artist then the answer is clear.

## Hiring a human for the art

I'm now working with a freelance artist on the sprites. That turned out to be the right call for one reason: animation is a craft of consistency, and that's exactly what the AI couldn't hold.

AI didn't become useless, though. It just moved earlier in the process:

![AI-generated concept art](/blog/ai-for-game-assets/concept-art.png)

So what im doing right now is that im using AI to generate a concept art, and this is an example of brachiosaurus that I generated using Gemini AI. And based on this a profesional artis can do something like this:

<video src="/blog/ai-for-game-assets/artist-animation.mp4" autoplay loop muted playsinline></video>

you can clearly check that the animation is completly smooth and fits exactly with the main idea.

The lesson for me: AI is a fast way to explore what a character could look like. It's not a reliable way to produce a game-ready animated character.

## Sound effects: usable, after iterations

For SFX I used ElevenLabs, and here the story is better. The sounds I generated did end up in the game. But "generated" undersells the work.

**Iteration.** First outputs were rarely right. Getting a sound that fit the creature, the action and the game's tone took many rounds of prompting and regenerating.

Every SFX took in average 3 iterations to reach the quality that I want.

**Levels.** Even a good take usually came out at the wrong loudness for the mix. I had to adjust the output in dB so effects sat together: no attack drowning out the UI, no death sound getting lost in a busy fight.

I usally hear the sounds and normalize them by hand.

This is why my suggestion is to implement a system that allows you to regenerate easily the sound effects that you dont like just re-prompting for adjustements.

![SFX prompts and durations stored in JSON](/blog/ai-for-game-assets/sfx-prompts-json.png)

you can store in a JSON (for example), the prompts used with the duration and then by a code script generate the sound effects that you dont like or would like to adjust. Create this kind of systems or tools is quite easy to do using AI these days.

In the end is just matter of generate the SFX hear them and re-prompt for fixes, in this scenarios the AI works widely better than for sprites.

## Scorecard

| Asset | Tool | Verdict | Why |
| --- | --- | --- | --- |
| Sound effects | ElevenLabs | Usable with some iterations | Good results after many iterations and level adjustments |
| Animated sprites | ludo.ai | Not there yet | Frames drift and motion doesn't flow |
| Character concepts | Gemini | Usable with some iterations | The important topic is to express the main references of the character to the artist, and dont let the artist just copy the concept |

## What I'd tell another solo dev

- **Judge tools on sequences, not single outputs.** One great frame or one great sound proves little. Test a full animation loop or a full mix.
- **Budget the iteration.** "AI-generated" still means hours of prompting, regenerating and adjusting.
- **Know where the craft is.** Sound effects are mostly self-contained, so AI handled them. Animation depends on consistency across many frames, which AI still struggles with.
- **Spend money where AI is weakest.** For me that meant a freelance artist for sprites, and AI for sound.
