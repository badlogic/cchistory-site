import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import * as monaco from "monaco-editor";

// Live reload for development
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
   const ws = new WebSocket(`ws://${window.location.host}/livereload`);
   ws.onmessage = () => {
      // Force hard refresh to clear any cached state
      location.reload();
   };

   // Reconnect on disconnect
   ws.onclose = () => {
      setTimeout(() => {
         location.reload();
      }, 1000);
   };
}

@customElement("cc-app")
export class CCApp extends LitElement {
   // Don't use shadow DOM to allow Tailwind styles
   createRenderRoot() {
      return this;
   }

   @property({ type: String })
   fromVersion = "1.0.0";

   @property({ type: String })
   toVersion = "";

   @property({ type: Array })
   versions: string[] = [];

   @property({ type: Boolean })
   loading = true;

   @property({ type: String })
   error = "";

   private diffEditor?: monaco.editor.IStandaloneDiffEditor;
   private resizeObserver?: ResizeObserver;

   async connectedCallback() {
      super.connectedCallback();

      // Parse URL parameters
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get("from");
      const toParam = params.get("to");

      // Load versions and initialize
      await this.loadVersions();

      // Set versions from URL or defaults
      if (fromParam && this.versions.includes(fromParam)) {
         this.fromVersion = fromParam;
      }
      if (toParam && this.versions.includes(toParam)) {
         this.toVersion = toParam;
      }

      // Load initial diff if versions are set
      if (this.fromVersion && this.toVersion) {
         await this.updateComplete;
         await this.initializeDiffEditor();
      }
   }

   disconnectedCallback() {
      super.disconnectedCallback();
      this.diffEditor?.dispose();
      this.resizeObserver?.disconnect();
   }

   private async loadVersions() {
      try {
         // Check for error first
         const errorResponse = await fetch("/data/error.json");
         if (errorResponse.ok) {
            const errorData = await errorResponse.json();
            this.error = `Update service error: ${errorData.error}`;
            this.loading = false;
            return;
         }

         // Load versions
         const versionsResponse = await fetch("/data/versions.json");
         if (!versionsResponse.ok) {
            // Check if data is still being populated
            if (versionsResponse.status === 404) {
               this.error = "Data is being populated, please check back in a few minutes...";
            } else {
               this.error = "Failed to load versions";
            }
            this.loading = false;
            return;
         }

         const data = await versionsResponse.json();
         this.versions = data.versions.map((v: { version: string }) => v.version);

         // Set default versions if not already set
         if (!this.fromVersion && this.versions.length > 0) {
            this.fromVersion = this.versions[0];
         }
         if (!this.toVersion && this.versions.length > 0) {
            this.toVersion = this.versions[this.versions.length - 1];
         }

         this.loading = false;
      } catch (err) {
         this.error = "Failed to load versions";
         this.loading = false;
      }
   }

   render() {
      return html`
      <div class="flex flex-col h-screen">
      <header class="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-50 flex-shrink-0">
        <div class="px-4 sm:px-6 lg:px-8 py-3">
          <div class="flex flex-col gap-2">
            <!-- Desktop layout -->
            <div class="hidden sm:flex items-center justify-between">
              <div class="flex items-center gap-6">
                <div>
                  <h1 class="text-2xl font-bold text-white">cchistory</h1>
                  <p class="text-neutral-400 text-sm">
                    Track Claude Code prompts over time
                  </p>
                </div>

                <!-- Version selectors -->
                <div class="flex items-center gap-3">
                  <select
                    class="bg-neutral-800 text-white border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 cursor-pointer font-mono"
                    .value=${this.fromVersion}
                    @change=${this.handleFromVersionChange}
                    ?disabled=${this.loading}
                  >
                    ${this.versions.map(
                       (v) => html`
                      <option value=${v} ?selected=${v === this.fromVersion}>${v}</option>
                    `,
                    )}
                  </select>

                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" class="text-neutral-500 flex-shrink-0">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m0 0l-6-6m6 6l-6 6"/>
                  </svg>

                  <select
                    class="bg-neutral-800 text-white border border-neutral-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 cursor-pointer font-mono"
                    .value=${this.toVersion}
                    @change=${this.handleToVersionChange}
                    ?disabled=${this.loading}
                  >
                    ${this.versions.map(
                       (v) => html`
                      <option value=${v} ?selected=${v === this.toVersion}>${v}</option>
                    `,
                    )}
                  </select>
                </div>
              </div>

              <!-- By Mario + GitHub -->
              <div class="flex items-center gap-2 text-neutral-400 text-sm">
                <span>By <a
                  href="https://mariozechner.at"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-neutral-300 hover:text-white transition-colors"
                >Mario</a></span>
                <a
                  href="https://github.com/badlogic/cchistory"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
                  </svg>
                </a>
              </div>
            </div>

            <!-- Mobile layout -->
            <div class="flex sm:hidden items-center justify-between gap-2">
              <h1 class="text-xl font-bold text-white flex-shrink-0">cchistory</h1>
              
              <!-- Version selectors on mobile - in first row -->
              <div class="flex items-center gap-2 flex-1 justify-end">
                <select
                  class="bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500 cursor-pointer font-mono"
                  .value=${this.fromVersion}
                  @change=${this.handleFromVersionChange}
                  ?disabled=${this.loading}
                >
                  ${this.versions.map(
                     (v) => html`
                    <option value=${v} ?selected=${v === this.fromVersion}>${v}</option>
                  `,
                  )}
                </select>

                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" class="text-neutral-500 flex-shrink-0">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m0 0l-6-6m6 6l-6 6"/>
                </svg>

                <select
                  class="bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-purple-500 cursor-pointer font-mono"
                  .value=${this.toVersion}
                  @change=${this.handleToVersionChange}
                  ?disabled=${this.loading}
                >
                  ${this.versions.map(
                     (v) => html`
                    <option value=${v} ?selected=${v === this.toVersion}>${v}</option>
                  `,
                  )}
                </select>
              </div>
            </div>

            <!-- One-liner description with By Mario right-aligned - visible on mobile -->
            <div class="flex sm:hidden items-center justify-between text-neutral-400 text-sm">
              <span>Track Claude Code prompts over time.</span>
              <span class="flex items-center gap-1">
                By <a
                  href="https://mariozechner.at"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-neutral-300 hover:text-white transition-colors"
                >Mario</a>
                <a
                  href="https://github.com/badlogic/cchistory"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-neutral-400 hover:text-white transition-colors"
                >
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
                  </svg>
                </a>
              </span>
            </div>
          </div>
        </div>
      </header>

      <main class="bg-black text-neutral-300 flex-1">
        <div class="w-full h-full">
          ${
             this.loading
                ? html`
            <div class="text-center py-16">
              <div class="text-neutral-500">Loading versions...</div>
            </div>
          `
                : this.error
                  ? html`
            <div class="text-center py-16">
              <div class="text-red-500">${this.error}</div>
              ${
                 this.error.includes("Update service")
                    ? html`
                <div class="mt-4">
                  <a href="/data/logs.txt" target="_blank" class="text-purple-400 hover:text-purple-300 underline">
                    View update logs
                  </a>
                </div>
              `
                    : ""
              }
            </div>
          `
                  : html`
            <div id="monaco-container" class="w-full h-full"></div>
          `
          }
        </div>
      </main>
      </div>
    `;
   }

   private async initializeDiffEditor() {
      const container = this.querySelector("#monaco-container") as HTMLElement;
      if (!container) return;

      try {
         // Show loading state
         container.innerHTML =
            '<div class="flex items-center justify-center h-full text-neutral-500">Loading diff...</div>';

         // Fetch both prompt files
         const [fromResponse, toResponse] = await Promise.all([
            fetch(`/data/prompts-${this.fromVersion}.md`),
            fetch(`/data/prompts-${this.toVersion}.md`),
         ]);

         if (!fromResponse.ok || !toResponse.ok) {
            this.error = "Failed to load prompt files";
            return;
         }

         const originalContent = await fromResponse.text();
         const modifiedContent = await toResponse.text();

         // Clear loading state
         container.innerHTML = "";

         // Create diff editor
         this.diffEditor = monaco.editor.createDiffEditor(container, {
            theme: "vs-dark",
            readOnly: true,
            renderSideBySide: window.innerWidth >= 768,
            minimap: { enabled: false },
            lineNumbers: "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            overviewRulerLanes: 0,
            renderIndicators: false,
            folding: false,
         });

         const originalModel = monaco.editor.createModel(originalContent, "markdown");
         const modifiedModel = monaco.editor.createModel(modifiedContent, "markdown");

         this.diffEditor.setModel({
            original: originalModel,
            modified: modifiedModel,
         });
      } catch (err) {
         this.error = "Failed to load diff";
         console.error("Error loading diff:", err);
      }

      // Handle resize
      this.resizeObserver = new ResizeObserver(() => {
         this.diffEditor?.layout();
         // Update options based on width
         const isMobile = window.innerWidth < 768;
         this.diffEditor?.updateOptions({
            renderSideBySide: !isMobile,
         });
      });
      this.resizeObserver.observe(container);
   }

   private async handleFromVersionChange(e: Event) {
      const select = e.target as HTMLSelectElement;
      const newFromVersion = select.value;

      // Ensure from version is not newer than to version
      if (this.compareVersions(newFromVersion, this.toVersion) > 0) {
         select.value = this.fromVersion; // Reset to previous value
         return;
      }

      this.fromVersion = newFromVersion;
      await this.updateDiff();
   }

   private async handleToVersionChange(e: Event) {
      const select = e.target as HTMLSelectElement;
      const newToVersion = select.value;

      // Ensure to version is not older than from version
      if (this.compareVersions(this.fromVersion, newToVersion) > 0) {
         select.value = this.toVersion; // Reset to previous value
         return;
      }

      this.toVersion = newToVersion;
      await this.updateDiff();
   }

   private async updateDiff() {
      if (!this.fromVersion || !this.toVersion || !this.diffEditor) return;

      // Update URL
      this.updateURL();

      try {
         // Fetch both prompt files
         const [fromResponse, toResponse] = await Promise.all([
            fetch(`/data/prompts-${this.fromVersion}.md`),
            fetch(`/data/prompts-${this.toVersion}.md`),
         ]);

         if (!fromResponse.ok || !toResponse.ok) {
            this.error = "Failed to load prompt files";
            return;
         }

         const originalContent = await fromResponse.text();
         const modifiedContent = await toResponse.text();

         // Get current model and dispose it properly
         const currentModel = this.diffEditor.getModel();
         if (currentModel) {
            currentModel.original.dispose();
            currentModel.modified.dispose();
         }

         const originalModel = monaco.editor.createModel(originalContent, "markdown");
         const modifiedModel = monaco.editor.createModel(modifiedContent, "markdown");

         this.diffEditor.setModel({
            original: originalModel,
            modified: modifiedModel,
         });
      } catch (err) {
         this.error = "Failed to load diff";
         console.error("Error updating diff:", err);
      }
   }

   private updateURL() {
      const params = new URLSearchParams();
      params.set("from", this.fromVersion);
      params.set("to", this.toVersion);
      const newURL = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, "", newURL);
   }

   // Semantic version comparison
   private compareVersions(a: string, b: string): number {
      const parseVersion = (v: string) => {
         const parts = v.split(".").map((p) => parseInt(p, 10));
         return {
            major: parts[0] || 0,
            minor: parts[1] || 0,
            patch: parts[2] || 0,
         };
      };

      const va = parseVersion(a);
      const vb = parseVersion(b);

      if (va.major !== vb.major) return va.major - vb.major;
      if (va.minor !== vb.minor) return va.minor - vb.minor;
      return va.patch - vb.patch;
   }

   private sortVersions(versions: string[]): string[] {
      return [...versions].sort(this.compareVersions);
   }
}
