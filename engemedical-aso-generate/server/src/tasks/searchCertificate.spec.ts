const assert = require("node:assert/strict");
const {
  POST_SEARCH_RESULT_STABILIZATION_DELAY_MS,
  selectMedicalRecordSearchResult,
} = require("./searchCertificate");
export {};

type FakeHandle = {
  click: () => Promise<void>;
  type?: (value: string, options?: unknown) => Promise<void>;
};

type FakeFrameState = {
  clickedResult: boolean;
  waitedSelectors: string[];
};

function createFakeFrame() {
  const state: FakeFrameState = {
    clickedResult: false,
    waitedSelectors: [],
  };

  const resultHandle: FakeHandle = {
    async click() {
      state.clickedResult = true;
    },
  };

  return {
    state,
    async waitForSelector(selector: string) {
      state.waitedSelectors.push(selector);
      if (selector.includes("fieldset-resultado-prontuario")) {
        return resultHandle;
      }

      return {
        async click() {
          return;
        },
      };
    },
    async $(selector: string) {
      if (selector.includes("fieldset-resultado-prontuario")) {
        return resultHandle;
      }

      return null;
    },
  };
}

async function testClicksSearchResultAfterStabilizationDelay() {
  const frame = createFakeFrame();

  await selectMedicalRecordSearchResult(frame);

  assert.equal(frame.state.clickedResult, true);
}

function testUsesFourSecondStabilizationDelayBeforeClickingResult() {
  assert.equal(POST_SEARCH_RESULT_STABILIZATION_DELAY_MS, 4000);
}

async function main() {
  testUsesFourSecondStabilizationDelayBeforeClickingResult();
  await testClicksSearchResultAfterStabilizationDelay();
  console.log("searchCertificate.spec.ts: ok");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
