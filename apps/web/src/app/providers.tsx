'use client';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from '@/lib/amplifyConfig';

// 在客户端配置Amplify
if (typeof window !== 'undefined') {
  Amplify.configure(amplifyConfig);
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
