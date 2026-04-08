/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import StorybookGenerator from './components/StorybookGenerator';
import { ApiKeySelection } from './components/ApiKeySelection';

export default function App() {
  const [isKeySelected, setIsKeySelected] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {!isKeySelected && (
        <ApiKeySelection onKeySelected={() => setIsKeySelected(true)} />
      )}
      <StorybookGenerator />
    </div>
  );
}


