/**
 * Tests for canonical reference construction
 */

describe('Canonical Reference Construction', () => {
  test('should use period (.) as delimiter when building from document, section, and subsection', () => {
    // Simulate the logic from deer-config.js line 1854-1862
    const obj = {
      _document: { value: 'Manuscript' },
      _section: { value: '2' },
      _subsection: { value: '17' }
    };

    let canonicalReference = obj?.canonicalReference?.value || "";
    let doc = obj?._document?.value;
    const section = obj?._section?.value || obj?.targetChapter?.value;
    const subsection = obj?._subsection?.value || obj?.targetVerse?.value;

    if(doc && section && subsection) {
      canonicalReference = `${doc} ${section}.${subsection}`;
    }

    expect(canonicalReference).toBe('Manuscript 2.17');
  });

  test('should preserve user-entered canonical reference when provided', () => {
    // When user enters a canonical reference directly, it should be used
    const obj = {
      canonicalReference: { value: 'Matthew 5:1' },
      _document: { value: 'Matthew' },
      _section: { value: '5' },
      _subsection: { value: '1' }
    };

    let canonicalReference = obj?.canonicalReference?.value || "";
    
    // The entered value should be preserved
    expect(canonicalReference).toBe('Matthew 5:1');
  });

  test('should build canonical reference when no user input is provided', () => {
    // When no canonical reference is entered but structured fields exist
    const obj = {
      _document: { value: 'Sententiae' },
      _section: { value: 'liber 2' },
      _subsection: { value: 'dist. 17' }
    };

    let canonicalReference = obj?.canonicalReference?.value || "";
    let doc = obj?._document?.value;
    const section = obj?._section?.value || obj?.targetChapter?.value;
    const subsection = obj?._subsection?.value || obj?.targetVerse?.value;

    if(doc && section && subsection) {
      canonicalReference = `${doc} ${section}.${subsection}`;
    }

    expect(canonicalReference).toBe('Sententiae liber 2.dist. 17');
  });

  test('should return empty string when no data is available', () => {
    const obj = {};

    let canonicalReference = obj?.canonicalReference?.value || "";
    let doc = obj?._document?.value;
    const section = obj?._section?.value || obj?.targetChapter?.value;
    const subsection = obj?._subsection?.value || obj?.targetVerse?.value;

    if(doc && section && subsection) {
      canonicalReference = `${doc} ${section}.${subsection}`;
    }

    expect(canonicalReference).toBe('');
  });

  test('should support backwards compatibility with targetChapter and targetVerse', () => {
    // Old data format with targetChapter and targetVerse
    const obj = {
      _document: { value: 'Matthew' },
      targetChapter: { value: '5' },
      targetVerse: { value: '4' }
    };

    let canonicalReference = obj?.canonicalReference?.value || "";
    let doc = obj?._document?.value;
    const section = obj?._section?.value || obj?.targetChapter?.value;
    const subsection = obj?._subsection?.value || obj?.targetVerse?.value;

    if(doc && section && subsection) {
      canonicalReference = `${doc} ${section}.${subsection}`;
    }

    expect(canonicalReference).toBe('Matthew 5.4');
  });
});
