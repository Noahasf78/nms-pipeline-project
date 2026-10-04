import pytest
from pydantic import ValidationError

from app.core.schemas import Pipeline, PipelineCreate


@pytest.mark.parametrize("name", ["", " ", "\t\n\r", "\u00a0\u2003"])
def test_pipeline_create_rejects_blank_names(name):
    with pytest.raises(ValidationError) as exc_info:
        PipelineCreate(name=name)

    errors = exc_info.value.errors()
    assert len(errors) == 1
    assert errors[0]["loc"] == ("name",)
    assert errors[0]["type"] == "value_error"


@pytest.mark.parametrize("name", ["CT Chest Segmentation", "  Brain MRI Analysis  ", "\tX\n"])
def test_pipeline_create_preserves_valid_names(name):
    pipeline = PipelineCreate(name=name)

    assert pipeline.name == name


def test_stored_pipeline_still_accepts_blank_name():
    pipeline = Pipeline(id="existing", name="")

    assert pipeline.name == ""
