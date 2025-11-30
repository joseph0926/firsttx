interface Chunk {
  id: string;
  title: string;
  section: string;
  content: string;
}

function chunkMdx(content: string, docId: string): Chunk[] {
  const lines = content.split("\n");
  const chunks: Chunk[] = [];

  let currentH1 = "";
  let currentH2 = "";
  let currentH3 = "";
  let currentContent: string[] = [];

  function saveCurrentChunk() {
    const trimmedContent = currentContent.join("\n").trim();

    if (trimmedContent.length > 0) {
      chunks.push({
        id: `${docId}-${chunks.length + 1}`,
        title: currentH1,
        section: currentH3 || currentH2 || currentH1,
        content: trimmedContent,
      });
    }
    currentContent = [];
  }

  for (const line of lines) {
    if (line.startsWith("### ")) {
      saveCurrentChunk();
      currentH3 = line.slice(4);
    } else if (line.startsWith("## ")) {
      saveCurrentChunk();
      currentH2 = line.slice(3);
      currentH3 = "";
    } else if (line.startsWith("# ")) {
      saveCurrentChunk();
      currentH1 = line.slice(2);
      currentH2 = "";
      currentH3 = "";
    } else {
      currentContent.push(line);
    }
  }

  saveCurrentChunk();

  return chunks;
}

const testContent = `
# Prepaint

소개 문단입니다.

## 1. 설치

설치 방법입니다.

### 1-1. npm

npm으로 설치합니다.

### 1-2. yarn

yarn으로 설치합니다.

## 2. 사용법

사용법입니다.
`;

console.log(chunkMdx(testContent, "prepaint-ko"));
