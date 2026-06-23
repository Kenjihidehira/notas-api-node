const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

class NoteStorage {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async ensureFile() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, "[]");
    }
  }

  async all() {
    await this.ensureFile();
    const content = await fs.readFile(this.filePath, "utf8");
    return JSON.parse(content);
  }

  async save(notes) {
    await this.ensureFile();
    await fs.writeFile(this.filePath, JSON.stringify(notes, null, 2));
  }

  async create(data) {
    const notes = await this.all();
    const note = {
      id: crypto.randomUUID(),
      title: data.title.trim(),
      content: data.content.trim(),
      favorite: Boolean(data.favorite),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    notes.unshift(note);
    await this.save(notes);
    return note;
  }

  async update(id, data) {
    const notes = await this.all();
    const index = notes.findIndex((note) => note.id === id);

    if (index === -1) return null;

    notes[index] = {
      ...notes[index],
      ...data,
      title: typeof data.title === "string" ? data.title.trim() : notes[index].title,
      content: typeof data.content === "string" ? data.content.trim() : notes[index].content,
      updatedAt: new Date().toISOString()
    };

    await this.save(notes);
    return notes[index];
  }

  async delete(id) {
    const notes = await this.all();
    const nextNotes = notes.filter((note) => note.id !== id);

    if (nextNotes.length === notes.length) return false;

    await this.save(nextNotes);
    return true;
  }
}

module.exports = { NoteStorage };
