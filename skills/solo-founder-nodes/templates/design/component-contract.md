# Component Contract — &lt;ComponentName&gt;

> Output of the design step, input to implementation. Compact and explicit — this is what the coding
> agent implements against, so it does not improvise.

## Purpose
One sentence: what the component does and where it lives.

## Props / data
| prop | type | required | notes |
|---|---|---|---|
| &lt;name&gt; | &lt;type&gt; | yes/no | &lt;source / default&gt; |

## States
- default
- loading
- empty
- error
- &lt;interaction state&gt; (hover / active / selected / expanded)

## Tokens & layout
- tokens used (named, from the existing design system)
- spacing / grid / breakpoints
- motion / transitions (durations, easing) — respect reduced-motion

## Design-skill inputs
- selected skills: &lt;ids&gt;
- decisions imported from those skills: &lt;brief, specific, implementation-ready rules&gt;
- style/platform decisions: &lt;style preset, mobile platform, shadcn registry/MCP result&gt;
- generated-media assets: &lt;paths + prompt + license/usage notes, or none&gt;
- excluded guidance: &lt;Claude-only commands, unsupported dependencies, off-brand style moves&gt;

## Interactions
- click / keyboard / focus behavior
- what each action emits (callback / event / mutation)

## Accessibility
- role / aria
- focus order, keyboard path
- contrast + hit-target minimums

## Implementation target
- file(s): &lt;path&gt;
- reuse: &lt;existing components/utilities&gt;
- do NOT add one-off CSS; extend the token system

## Acceptance (feeds visual-regression-checklist.md)
- DOM selectors present: &lt;testids / roles&gt;
- screenshot states captured: &lt;list&gt;
- interaction verified: &lt;path&gt;
- transfer proof: the surface is driven by a real backend run, not a static mock
