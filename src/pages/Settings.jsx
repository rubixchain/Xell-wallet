import Header from '../components/dashboard/Header';
import SettingsContent from '../components/settings/SettingsContent';
import Navigation from '../components/dashboard/Navigation';
import ContentContainer from '../components/layout/ContentContainer';

export default function Settings() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />


      <ContentContainer>
        <main className=" flex pb-24 min-h-screen justify-center">
          <div className='w-full py-6 sm:p-10 space-y-6 bg-white dark:bg-gray-800 pb-20 shadow-xl p-3 sm:p-4 transition-colors'>
            <SettingsContent />
          </div>
        </main>
      </ContentContainer>

      <Navigation />
    </div>
  );
}