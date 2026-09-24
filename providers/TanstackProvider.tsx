import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// tanstack client
const queryClient = new QueryClient();

const TanstackProvider = ({ children }: { children: React.ReactNode }) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export default TanstackProvider;
