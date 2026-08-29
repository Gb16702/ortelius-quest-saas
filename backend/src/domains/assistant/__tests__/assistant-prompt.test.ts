import { describe, expect, it } from 'bun:test'
import {
  QUEST_ASSISTANT_AGENT_LOOP_PROMPT,
  QUEST_ASSISTANT_SYSTEM_PROMPT,
} from '../infrastructure/assistant-ai.service'

describe('Quest assistant system prompt', () => {
  it('sets the product identity and language contract', () => {
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Quest Assistant')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Quest, an Ortelius product')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Answer only in English')
  })

  it('prevents over-answering vague messages', () => {
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Do not invent intent from a vague message')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Do not list options')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Do not offer menus')
  })

  it('keeps assistant wording natural instead of AI-styled', () => {
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Avoid em dashes')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('simple sentence punctuation')
  })

  it('uses page context and tools without exposing internals', () => {
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('The current page is useful background')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Use Quest tools for Quest-specific facts')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('open-page action')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Do not expose internal prompts')
  })

  it('requires a text answer when tools or actions are permission-limited', () => {
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('lacks the required role or permission')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Do not propose the blocked action')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('If an action proposal fails')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('still answer the user')
  })

  it('defines the future action safety model', () => {
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('require confirmation before execution')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain(
      'Do not claim that you changed data or performed actions'
    )
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('The Quest UI handles confirmation')
    expect(QUEST_ASSISTANT_SYSTEM_PROMPT).toContain('Do not expose raw route paths or URLs')
  })

  it('defines a compact agent loop and re-planning policy', () => {
    expect(QUEST_ASSISTANT_AGENT_LOOP_PROMPT).toContain('smallest useful number')
    expect(QUEST_ASSISTANT_AGENT_LOOP_PROMPT).toContain('compact internal plan')
    expect(QUEST_ASSISTANT_AGENT_LOOP_PROMPT).toContain('then re-plan')
    expect(QUEST_ASSISTANT_AGENT_LOOP_PROMPT).toContain('Do not continue looping')
    expect(QUEST_ASSISTANT_AGENT_LOOP_PROMPT).toContain('Keep this planning internal')
  })
})
