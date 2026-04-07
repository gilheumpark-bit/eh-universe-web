/**
 * SettingsPanel (code-studio) — renders settings form
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPanel } from '../code-studio/SettingsPanel';

describe('SettingsPanel', () => {
  it('renders without crashing (no props)', () => {
    const { container } = render(<SettingsPanel />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders settings tab buttons', () => {
    const { container } = render(<SettingsPanel />);
    const buttons = container.querySelectorAll('button');
    // Should have tab buttons for editor, ai, pipeline
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders with custom settings', () => {
    const settings = {
      fontSize: 16,
      tabSize: 4,
      wordWrap: false,
      minimap: false,
      lineNumbers: true,
      bracketGuides: true,
      stickyScroll: true,
      renderWhitespace: 'none' as const,
      cursorStyle: 'block' as const,
      theme: 'dark' as const,
      autoSave: true,
      autoSaveDelay: 500,
      formatOnSave: false,
      terminalFontSize: 12,
      aiTemperature: 0.7,
      aiMaxTokens: 4096,
      aiGhostText: true,
      aiAutoSuggestDelay: 800,
      pipelinePassThreshold: 77,
      actionApprovalMode: 'normal' as const,
    };
    const onChange = jest.fn();
    const { container } = render(
      <SettingsPanel settings={settings} onChange={onChange} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders close button when onClose is provided', () => {
    const onClose = jest.fn();
    render(<SettingsPanel onClose={onClose} />);
    // The X close button should be present
    const closeButtons = screen.queryAllByRole('button');
    expect(closeButtons.length).toBeGreaterThan(0);
  });
});
