import logging
import warnings

import litellm
import opik
from litellm.integrations.opik.opik import OpikLogger

from .diffs import Diff


def enable_tracing() -> None:
    # In a plain script OpikLogger warns about a missing event loop while it falls back to
    # synchronous sending. The traces still arrive, so the noise is hidden.
    logging.getLogger("LiteLLM").setLevel(logging.CRITICAL)
    warnings.filterwarnings("ignore", message=".*periodic_flush.*", category=RuntimeWarning)
    # OpikLogger turns every litellm.completion call into one Opik trace with an llm span,
    # token usage and estimated cost. Without it nothing reaches Opik.
    litellm.callbacks = [OpikLogger()]
    logging.getLogger("LiteLLM").setLevel(logging.WARNING)


def trace_metadata(model: str, diff: Diff) -> dict:
    # Tags make "one model" a filter in the Opik traces table; the extra metadata keys show
    # up on the trace so a row can be tied back to its diff.
    return {
        "opik": {
            "tags": [model.split("/")[-1], diff.id],
            "metadata": {"model": model, "diff_id": diff.id},
        }
    }


def flush_traces() -> None:
    # Sending is batched in the background; without a flush the process can exit with
    # the last traces still unsent.
    opik.flush_tracker()
