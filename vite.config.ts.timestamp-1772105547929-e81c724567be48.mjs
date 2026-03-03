// vite.config.ts
import { defineConfig } from "file:///C:/Users/Dennis/Pro-Charts/klinecharts-pro-source/node_modules/vite/dist/node/index.js";
import solidPlugin from "file:///C:/Users/Dennis/Pro-Charts/klinecharts-pro-source/node_modules/vite-plugin-solid/dist/esm/index.mjs";
var vite_config_default = defineConfig({
  plugins: [solidPlugin()],
  envDir: "../",
  build: {
    cssTarget: "chrome61",
    sourcemap: true,
    rollupOptions: {
      external: ["klinecharts"],
      output: {
        assetFileNames: (chunkInfo) => {
          if (chunkInfo.name === "style.css") {
            return "klinecharts-pro.css";
          }
        },
        globals: {
          klinecharts: "klinecharts"
        }
      }
    },
    lib: {
      entry: "./src/index.ts",
      name: "klinechartspro",
      fileName: (format) => {
        if (format === "es") {
          return "klinecharts-pro.js";
        }
        if (format === "umd") {
          return "klinecharts-pro.umd.js";
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxEZW5uaXNcXFxcUHJvLUNoYXJ0c1xcXFxrbGluZWNoYXJ0cy1wcm8tc291cmNlXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxEZW5uaXNcXFxcUHJvLUNoYXJ0c1xcXFxrbGluZWNoYXJ0cy1wcm8tc291cmNlXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9EZW5uaXMvUHJvLUNoYXJ0cy9rbGluZWNoYXJ0cy1wcm8tc291cmNlL3ZpdGUuY29uZmlnLnRzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlL2NsaWVudFwiIC8+XHJcblxyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgc29saWRQbHVnaW4gZnJvbSAndml0ZS1wbHVnaW4tc29saWQnXHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtzb2xpZFBsdWdpbigpXSxcclxuICBlbnZEaXI6ICcuLi8nLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBjc3NUYXJnZXQ6ICdjaHJvbWU2MScsXHJcbiAgICBzb3VyY2VtYXA6IHRydWUsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIGV4dGVybmFsOiBbJ2tsaW5lY2hhcnRzJ10sXHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoY2h1bmtJbmZvKSA9PiB7XHJcbiAgICAgICAgICBpZiAoY2h1bmtJbmZvLm5hbWUgPT09ICdzdHlsZS5jc3MnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAna2xpbmVjaGFydHMtcHJvLmNzcydcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGdsb2JhbHM6IHtcclxuICAgICAgICAgIGtsaW5lY2hhcnRzOiAna2xpbmVjaGFydHMnXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBsaWI6IHtcclxuICAgICAgZW50cnk6ICcuL3NyYy9pbmRleC50cycsXHJcbiAgICAgIG5hbWU6ICdrbGluZWNoYXJ0c3BybycsXHJcbiAgICAgIGZpbGVOYW1lOiAoZm9ybWF0KSA9PiB7XHJcbiAgICAgICAgaWYgKGZvcm1hdCA9PT0gJ2VzJykge1xyXG4gICAgICAgICAgcmV0dXJuICdrbGluZWNoYXJ0cy1wcm8uanMnXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChmb3JtYXQgPT09ICd1bWQnKSB7XHJcbiAgICAgICAgICByZXR1cm4gJ2tsaW5lY2hhcnRzLXByby51bWQuanMnXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG59KVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBRUEsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxpQkFBaUI7QUFFeEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLFlBQVksQ0FBQztBQUFBLEVBQ3ZCLFFBQVE7QUFBQSxFQUNSLE9BQU87QUFBQSxJQUNMLFdBQVc7QUFBQSxJQUNYLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQyxhQUFhO0FBQUEsTUFDeEIsUUFBUTtBQUFBLFFBQ04sZ0JBQWdCLENBQUMsY0FBYztBQUM3QixjQUFJLFVBQVUsU0FBUyxhQUFhO0FBQ2xDLG1CQUFPO0FBQUEsVUFDVDtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFNBQVM7QUFBQSxVQUNQLGFBQWE7QUFBQSxRQUNmO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLEtBQUs7QUFBQSxNQUNILE9BQU87QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLFVBQVUsQ0FBQyxXQUFXO0FBQ3BCLFlBQUksV0FBVyxNQUFNO0FBQ25CLGlCQUFPO0FBQUEsUUFDVDtBQUNBLFlBQUksV0FBVyxPQUFPO0FBQ3BCLGlCQUFPO0FBQUEsUUFDVDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
