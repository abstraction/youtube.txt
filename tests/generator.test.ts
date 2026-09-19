import { describe, it, expect, vi } from 'vitest';
import { generateHtml, chunkParagraphs } from '../src/generator.js';
import type { Paragraph } from '../src/parser.js';
import fs from 'node:fs';

vi.mock('node:fs');

describe('chunkParagraphs', () => {
  it('splits long continuous takes when exceeding maximum paragraph threshold', () => {
    // 20 paragraphs all on the exact same static scene '0'
    const paragraphs: Paragraph[] = Array.from({ length: 20 }, (_, i) => ({
      seconds: i * 5,
      timestamp: `00:${String(i * 5).padStart(2, '0')}`,
      text: `Paragraph ${i + 1}`,
      sceneTimestamp: '0',
    }));

    const chapters = chunkParagraphs(paragraphs);
    // Should split instead of producing 1 never-ending chapter
    expect(chapters.length).toBeGreaterThan(1);
    expect(chapters[0]!.paragraphs.length).toBeLessThanOrEqual(15);
    expect(chapters[0]!.uniqueScenes).toEqual(['0']);
  });

  it('splits long continuous takes when exceeding maximum time duration', () => {
    // 5 paragraphs spanning 250 seconds on scene '0'
    const paragraphs: Paragraph[] = [
      { seconds: 0, timestamp: '00:00', text: 'P1', sceneTimestamp: '0' },
      { seconds: 50, timestamp: '00:50', text: 'P2', sceneTimestamp: '0' },
      { seconds: 120, timestamp: '02:00', text: 'P3', sceneTimestamp: '0' },
      { seconds: 190, timestamp: '03:10', text: 'P4', sceneTimestamp: '0' },
      { seconds: 250, timestamp: '04:10', text: 'P5', sceneTimestamp: '0' },
    ];

    const chapters = chunkParagraphs(paragraphs);
    expect(chapters.length).toBeGreaterThan(1);
  });

  it('does not create rapid micro-chapters for short rapid cuts', () => {
    // 4 paragraphs with rapid cuts every 2 seconds
    const paragraphs: Paragraph[] = [
      { seconds: 0, timestamp: '00:00', text: 'P1', sceneTimestamp: '0' },
      { seconds: 2, timestamp: '00:02', text: 'P2', sceneTimestamp: '2' },
      { seconds: 4, timestamp: '00:04', text: 'P3', sceneTimestamp: '4' },
      { seconds: 6, timestamp: '00:06', text: 'P4', sceneTimestamp: '6' },
    ];

    const chapters = chunkParagraphs(paragraphs);
    // Should not split prematurely into 1-sentence chapters
    expect(chapters.length).toBe(1);
    expect(chapters[0]!.paragraphs.length).toBe(4);
    expect(chapters[0]!.uniqueScenes).toEqual(['0', '2', '4', '6']);
  });

  it('caps unique scenes to maximum 6 to fit bento grid constraints', () => {
    // 8 different scenes
    const paragraphs: Paragraph[] = Array.from({ length: 8 }, (_, i) => ({
      seconds: i * 10,
      timestamp: `00:${String(i * 10).padStart(2, '0')}`,
      text: `Scene ${i}`,
      sceneTimestamp: String(i * 10),
    }));

    const chapters = chunkParagraphs(paragraphs);
    expect(chapters[0]!.uniqueScenes.length).toBeLessThanOrEqual(6);
    expect(chapters.length).toBeGreaterThan(1);
  });
});

describe('generateHtml', () => {
  it('renders index.html with provided chapters and metadata', async () => {
    let writtenHtml = '';
    vi.mocked(fs.writeFileSync).mockImplementation((_file, data) => {
      writtenHtml = String(data);
    });

    const paragraphs: Paragraph[] = [
      {
        seconds: 0,
        timestamp: '00:00',
        text: "Steven's analysis & take",
        sceneTimestamp: '0',
      },
      {
        seconds: 15,
        timestamp: '00:15',
        text: 'Next point',
        sceneTimestamp: '15',
      },
    ];

    await generateHtml(
      'https://youtube.com/watch?v=123',
      paragraphs,
      'Test Video'
    );

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(writtenHtml).toContain('Test Video');
    expect(writtenHtml).toContain('https://youtube.com/watch?v=123');
    expect(writtenHtml).toContain("Steven's analysis & take");
    expect(writtenHtml).toContain('--accent: #065fd4');
    expect(writtenHtml).toContain('--accent: #3ea6ff');
  });
});
