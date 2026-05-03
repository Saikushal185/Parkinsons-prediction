import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import { CheckCircle2, Loader2, Play, Search, UploadCloud } from "lucide-react";
import type { ModelInfo, SamplePayload } from "../types";

type SampleRow = SamplePayload["rows"][number];

type PredictPageProps = {
  refProp: RefObject<HTMLElement>;
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  sampleIndex: number;
  setSampleIndex: (index: number) => void;
  samples: SamplePayload | null;
  featureSearch: string;
  setFeatureSearch: (value: string) => void;
  editableFeatureNames: string[];
  currentSample: SampleRow | null;
  edits: Record<string, number | null>;
  setEdits: Dispatch<SetStateAction<Record<string, number | null>>>;
  isPredicting: boolean;
  selectedModel: ModelInfo | null;
  onPredict: () => void;
};

export function PredictPage({
  refProp,
  uploadedFile,
  setUploadedFile,
  sampleIndex,
  setSampleIndex,
  samples,
  featureSearch,
  setFeatureSearch,
  editableFeatureNames,
  currentSample,
  edits,
  setEdits,
  isPredicting,
  selectedModel,
  onPredict,
}: PredictPageProps) {
  return (
    <section ref={refProp} className="panel prediction-panel" id="predict">
      <WorkflowStep number="1" title="Upload CSV">
        <label className="dropzone">
          <UploadCloud size={30} />
          <strong>{uploadedFile ? uploadedFile.name : "Drag & drop CSV file here"}</strong>
          <span>{uploadedFile ? `${Math.ceil(uploadedFile.size / 1024)} KB selected` : "Browse Files"}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setUploadedFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {uploadedFile && (
          <button className="link-button" onClick={() => setUploadedFile(null)}>
            Use sample row instead
          </button>
        )}
      </WorkflowStep>

      <WorkflowStep number="2" title="Sample Row">
        <div className="row-tools">
          <label>
            Row
            <select value={sampleIndex} onChange={(event) => setSampleIndex(Number(event.target.value))}>
              {samples?.rows.map((row, index) => (
                <option key={row.row_index} value={index}>
                  {row.row_index + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="feature-search">
            <Search size={14} />
            <input
              value={featureSearch}
              placeholder="Search features"
              onChange={(event) => setFeatureSearch(event.target.value)}
            />
          </label>
        </div>
        <div className="feature-editor">
          {editableFeatureNames.map((feature) => (
            <label key={feature}>
              <span>{feature}</span>
              <input
                type="number"
                value={String(edits[feature] ?? currentSample?.features[feature] ?? "")}
                onChange={(event) =>
                  setEdits((existing) => ({
                    ...existing,
                    [feature]: event.target.value === "" ? null : Number(event.target.value),
                  }))
                }
              />
            </label>
          ))}
        </div>
      </WorkflowStep>

      <WorkflowStep number="3" title="Predict">
        <p className="muted">Run prediction on the uploaded CSV or selected edited sample row.</p>
        <div className="predict-actions">
          <button className="primary-button" onClick={onPredict} disabled={isPredicting || !selectedModel}>
            {isPredicting ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
            Run Prediction
          </button>
          <button
            className="secondary-button"
            onClick={() => {
              setUploadedFile(null);
              setEdits({});
            }}
          >
            Clear
          </button>
        </div>
        <div className="model-note">
          <CheckCircle2 size={16} />
          <span>{selectedModel?.model_key ?? "No model selected"}</span>
        </div>
      </WorkflowStep>
    </section>
  );
}

function WorkflowStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="workflow-step">
      <h2>
        <span>{number}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}
