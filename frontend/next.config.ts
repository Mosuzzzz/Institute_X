import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/student/learning',
        destination: '/learning/my-courses',
        permanent: false,
      },
      {
        source: '/student/:path*',
        destination: '/learning/:path*',
        permanent: false,
      },
      {
        source: '/teacher/:path*',
        destination: '/teaching/:path*',
        permanent: false,
      },
      {
        source: '/techer/:path*',
        destination: '/teaching/:path*',
        permanent: false,
      },
      {
        source: '/approver/teacher-requests',
        destination: '/reviewing/teaching-requests',
        permanent: false,
      },
      {
        source: '/approver/:path*',
        destination: '/reviewing/:path*',
        permanent: false,
      },
      {
        source: '/executive/:path*',
        destination: '/dashboard/:path*',
        permanent: false,
      },
      {
        source: '/registrar/:path*',
        destination: '/registration/:path*',
        permanent: false,
      },
      {
        source: '/learning/learning',
        destination: '/learning/my-courses',
        permanent: false,
      },
      {
        source: '/reviewing/teacher-requests',
        destination: '/reviewing/teaching-requests',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/learning/my-courses', destination: '/student/learning' },
      { source: '/learning/:path*', destination: '/student/:path*' },
      { source: '/teaching/:path*', destination: '/teacher/:path*' },
      {
        source: '/reviewing/teaching-requests',
        destination: '/approver/teacher-requests',
      },
      { source: '/reviewing/:path*', destination: '/approver/:path*' },
      { source: '/dashboard/:path*', destination: '/executive/:path*' },
      { source: '/registration/:path*', destination: '/registrar/:path*' },
    ];
  },
};

export default nextConfig;
