import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/learning/my-courses', destination: '/student/learning', permanent: false },
      { source: '/learning/learning', destination: '/student/learning', permanent: false },
      { source: '/learning/:path*', destination: '/student/:path*', permanent: false },
      { source: '/teaching/:path*', destination: '/teacher/:path*', permanent: false },
      { source: '/techer/:path*', destination: '/teacher/:path*', permanent: false },
      { source: '/reviewing/teaching-requests', destination: '/approver/teacher-requests', permanent: false },
      { source: '/reviewing/:path*', destination: '/approver/:path*', permanent: false },
      { source: '/registration/:path*', destination: '/registrar/:path*', permanent: false },
      { source: '/dashboard/:path*', destination: '/executive/:path*', permanent: false },
    ];
  },
};

export default nextConfig;
