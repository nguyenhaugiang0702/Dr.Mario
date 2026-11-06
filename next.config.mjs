/** Xuất tĩnh (thư mục out/) để mở trên bất kỳ hosting nào, không cần server */
const nextConfig = {
  output: 'export',
  experimental: {
    allowedDevOrigins: ['192.168.1.81:3000', 'localhost:3000', '192.168.1.*'],
  },
};

export default nextConfig;
