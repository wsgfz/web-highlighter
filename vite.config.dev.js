import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // 开发服务器配置
  server: {
    port: 8085,
    host: '0.0.0.0',
    open: true
  },
  
  // 开发模式的根目录指向example
  root: './example',
  
  // 解析配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@src': resolve(__dirname, 'src')
    }
  },
  
  // 公共基础路径
  base: './'
}); 