import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Home from '@/pages/Home';
import MapPage from '@/pages/MapPage';
import LightCandlePage from '@/pages/LightCandle';
import StatsPage from '@/pages/Stats';
import TopVoicesPage from '@/pages/TopVoices';
import VoicesPage from '@/pages/Voices';
import AboutPage from '@/pages/About';
import LegalPage from '@/pages/Legal';
import ShareCardPage from '@/pages/ShareCard';
import AdminPage from '@/pages/Admin';

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/map" component={MapPage} />
      <Route path="/light" component={LightCandlePage} />
      <Route path="/voices" component={VoicesPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/legal" component={LegalPage} />
      <Route path="/stats" component={StatsPage} />
      <Route path="/impact" component={StatsPage} />
      <Route path="/top-voices" component={TopVoicesPage} />
      <Route path="/share/:id" component={ShareCardPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
