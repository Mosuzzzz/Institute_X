-- Serialize every authoring mutation through its parent Course Version row.
-- This prevents child writes from landing after submission or publication.
CREATE OR REPLACE FUNCTION assert_course_version_is_draft()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_version_id uuid;
  target_status "CourseVersionStatus";
  target_archived_at timestamptz;
BEGIN
  IF TG_TABLE_NAME IN ('course_sections', 'content_items', 'course_cover_assets', 'quizzes') THEN
    IF TG_OP = 'DELETE' THEN
      target_version_id := OLD.version_id;
    ELSE
      target_version_id := NEW.version_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'media_assets' THEN
    SELECT version_id INTO target_version_id
    FROM content_items
    WHERE content_item_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.content_item_id ELSE NEW.content_item_id END;
  ELSIF TG_TABLE_NAME = 'questions' THEN
    SELECT version_id INTO target_version_id
    FROM quizzes
    WHERE quiz_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.quiz_id ELSE NEW.quiz_id END;
  ELSIF TG_TABLE_NAME = 'question_options' THEN
    SELECT qz.version_id INTO target_version_id
    FROM questions q
    JOIN quizzes qz ON qz.quiz_id = q.quiz_id
    WHERE q.question_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END;
  ELSIF TG_TABLE_NAME = 'question_image_assets' THEN
    SELECT qz.version_id INTO target_version_id
    FROM questions q
    JOIN quizzes qz ON qz.quiz_id = q.quiz_id
    WHERE q.question_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.question_id ELSE NEW.question_id END;
  END IF;

  SELECT cv.status, c.archived_at INTO target_status, target_archived_at
  FROM course_versions cv
  JOIN courses c ON c.course_id = cv.course_id
  WHERE cv.version_id = target_version_id
  FOR UPDATE;

  -- A missing parent is allowed only for database-driven cascading deletes.
  IF target_status IS NOT NULL AND (target_status <> 'DRAFT' OR target_archived_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Course Version is no longer editable'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER course_sections_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON course_sections
FOR EACH ROW EXECUTE FUNCTION assert_course_version_is_draft();

CREATE TRIGGER content_items_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON content_items
FOR EACH ROW EXECUTE FUNCTION assert_course_version_is_draft();

CREATE TRIGGER media_assets_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON media_assets
FOR EACH ROW EXECUTE FUNCTION assert_course_version_is_draft();

CREATE TRIGGER course_cover_assets_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON course_cover_assets
FOR EACH ROW EXECUTE FUNCTION assert_course_version_is_draft();

CREATE TRIGGER quizzes_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON quizzes
FOR EACH ROW EXECUTE FUNCTION assert_course_version_is_draft();

CREATE TRIGGER questions_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON questions
FOR EACH ROW EXECUTE FUNCTION assert_course_version_is_draft();

CREATE TRIGGER question_options_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON question_options
FOR EACH ROW EXECUTE FUNCTION assert_course_version_is_draft();

CREATE TRIGGER question_image_assets_require_draft
BEFORE INSERT OR UPDATE OR DELETE ON question_image_assets
FOR EACH ROW EXECUTE FUNCTION assert_course_version_is_draft();
