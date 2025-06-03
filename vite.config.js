import { defineConfig } from 'vite';
import { resolve } from 'path';
import { legacy } from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  
  // 开发服务器配置
  server: {
    port: 8085,
    host: '0.0.0.0',
    open: true
  },
  
  // 构建配置
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Highlighter',
      fileName: 'web-highlighter',
      formats: ['umd', 'es']
    },
    rollupOptions: {
      output: {
        globals: {
          // 如果有外部依赖，在这里定义
        }
      }
    },
    outDir: 'dist',
    sourcemap: true
  },
  
  // 解析配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@src': resolve(__dirname, 'src')
    }
  },
  
  // 定义开发模式的根目录
  root: process.env.NODE_ENV === 'development' ? './example' : './',
  
  // 公共基础路径
  base: './'
}); 