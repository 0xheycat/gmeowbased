/**
 * Quest Not Found Page
 * Professional 404 page for invalid quest slugs
 */

import Link from 'next/link';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function QuestNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* 404 Illustration */}
        <div className="relative">
          <div className="text-9xl font-bold text-gray-200 dark:text-gray-800">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <SearchIcon className="w-24 h-24 text-gray-400 dark:text-gray-600" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Quest Not Found
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            The quest you're looking for doesn't exist or may have been removed.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link
            href="/quests"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-colors shadow-lg hover:shadow-xl"
          >
            <SearchIcon className="w-5 h-5" />
            Browse All Quests
          </Link>
          
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 hover:border-primary-600 dark:hover:border-primary-600 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-semibold transition-colors"
          >
            <HomeIcon className="w-5 h-5" />
            Go Home
          </Link>
        </div>

        {/* Suggestions */}
        <div className="pt-12 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Looking for something specific? Try these popular quests:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/quests/first-cast"
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium transition-colors"
            >
              First Cast
            </Link>
            <Link
              href="/quests/follow-creator"
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium transition-colors"
            >
              Follow Creator
            </Link>
            <Link
              href="/quests/join-channel"
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium transition-colors"
            >
              Join Channel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
